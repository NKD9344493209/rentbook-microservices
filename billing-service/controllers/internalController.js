const Bill = require('../models/Bill');
const Complaint = require('../models/Complaint');
const assertObjectId = require('../utils/assertObjectId');
const { attachUserData } = require('../utils/enrich');

/* Called by user-service only (protected by x-service-key). */

// GET /internal/bills/summary?property=<propertyId>
// user-service asks this before it deletes a property.
const getPropertyBillSummary = async (req, res) => {
  assertObjectId(req.query.property, 'property id');
  const property = req.query.property;

  const [totalBills, pendingBills] = await Promise.all([
    Bill.countDocuments({ property }),
    Bill.countDocuments({ property, status: 'pending' }),
  ]);

  res.json({ property, totalBills, pendingBills });
};


// GET /internal/tenants/:id/owner
// notification-service asks: who is this tenant's owner? (whoever billed them last)
const getTenantOwner = async (req, res) => {
  assertObjectId(req.params.id, 'tenant id');
  const latest = await Bill.findOne({ tenant: req.params.id }).sort('-createdAt').select('owner');
  res.json({ tenant: req.params.id, owner: latest ? latest.owner : null });
};

// GET /internal/digest?remindDays=2
// Facts for the daily reminders, grouped per owner and per tenant.
const getDigest = async (req, res) => {
  const remindDays = Number(req.query.remindDays) || 2;
  const now = new Date();
  const soon = new Date(now.getTime() + remindDays * 86400000);
  const staleBefore = new Date(now.getTime() - 3 * 86400000);

  const [pendingBills, staleComplaints] = await Promise.all([
    Bill.find({ status: 'pending' }).sort('dueDate'),
    Complaint.find({ status: { $ne: 'resolved' }, createdAt: { $lte: staleBefore } }),
  ]);

  // INTER-SERVICE: tenant names from user-service (one batched call each)
  const { items: bills } = await attachUserData(pendingBills, req.id);
  const { items: complaints } = await attachUserData(staleComplaints, req.id);

  const owners = new Map();
  const tenants = new Map();
  const ownerBucket = (id) => owners.get(String(id)) || owners.set(String(id), { owner: id, overdue: [], dueSoon: [], staleComplaints: [], pendingAmount: 0, openComplaints: 0 }).get(String(id));
  const tenantBucket = (id) => tenants.get(String(id)) || tenants.set(String(id), { tenant: id, overdue: [], dueSoon: [] }).get(String(id));

  bills.forEach((b) => {
    const due = new Date(b.dueDate);
    const daysLeft = Math.ceil((due - now) / 86400000);
    const row = { _id: b._id, month: b.month, total: b.total, dueDate: b.dueDate, daysLeft, tenantName: b.tenant?.name || 'Tenant', room: b.room };
    const o = ownerBucket(b.owner);
    o.pendingAmount += b.total;
    if (due < now) {
      o.overdue.push(row);
      tenantBucket(b.tenant._id).overdue.push(row);
    } else if (due <= soon) {
      o.dueSoon.push(row);
      tenantBucket(b.tenant._id).dueSoon.push(row);
    }
  });

  complaints.forEach((c) => {
    ownerBucket(c.owner).staleComplaints.push({ _id: c._id, title: c.title, priority: c.priority, tenantName: c.tenant?.name || 'Tenant', createdAt: c.createdAt });
  });

  const openCounts = await Complaint.aggregate([{ $match: { status: { $ne: 'resolved' } } }, { $group: { _id: '$owner', n: { $sum: 1 } } }]);
  openCounts.forEach((r) => (ownerBucket(r._id).openComplaints = r.n));

  res.json({ generatedAt: now, remindDays, owners: [...owners.values()], tenants: [...tenants.values()] });
};

module.exports = { getPropertyBillSummary, getTenantOwner, getDigest };
