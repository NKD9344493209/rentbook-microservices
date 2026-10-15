const Bill = require('../models/Bill');
const Complaint = require('../models/Complaint');
const userService = require('../utils/userServiceClient');
const { isOutage } = require('../utils/enrich');

const sum = (bills) => bills.reduce((total, b) => total + b.total, 0);
const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

// The last six calendar months, oldest first, each starting at 0.
const lastSixMonths = () => {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: monthKey(d), month: d.toLocaleString('en-IN', { month: 'short' }), amount: 0 };
  });
};

// GET /api/tenant/summary
const getTenantSummary = async (req, res) => {
  const bills = await Bill.find({ tenant: req.user._id }).sort({ month: -1 });
  const pending = bills.filter((b) => b.status === 'pending').sort((a, b) => a.dueDate - b.dueDate);
  const currentBill = pending[0] || null; // the oldest unpaid bill is the one to pay first
  const latest = bills[0] || null;

  const openComplaints = await Complaint.countDocuments({ tenant: req.user._id, status: { $ne: 'resolved' } });

  // INTER-SERVICE CALL: property name lives in user-service.
  let propertyName = 'Not linked to a property yet';
  let degraded = false;
  if (latest?.property) {
    try {
      const property = await userService.getProperty(latest.property, req.id);
      propertyName = property ? property.name : 'Removed property';
    } catch (error) {
      if (!isOutage(error)) throw error;
      degraded = true;
      propertyName = 'Property name unavailable';
    }
  }

  res.json({
    property: propertyName,
    room: latest?.room || '—',
    amountDue: currentBill ? currentBill.total : 0,
    dueDate: currentBill ? currentBill.dueDate : null,
    totalOutstanding: sum(pending),
    unpaidBills: pending.length,
    totalPaid: sum(bills.filter((b) => b.status === 'paid')),
    openComplaints,
    currentBill,
    degraded,
  });
};

// GET /api/owner/stats
// Combines data from BOTH services: property data from user-service,
// money and complaints from billing-service.
const getOwnerStats = async (req, res) => {
  const ownerId = req.user._id;

  let properties = [];
  let degraded = false;
  try {
    properties = await userService.getPropertiesByOwner(ownerId, req.id); // INTER-SERVICE CALL
  } catch (error) {
    if (!isOutage(error)) throw error;
    degraded = true;
  }

  const [bills, openComplaints] = await Promise.all([
    Bill.find({ owner: ownerId }),
    Complaint.countDocuments({ owner: ownerId, status: { $ne: 'resolved' } }),
  ]);

  const rooms = properties.reduce((total, p) => total + p.rooms, 0);
  const occupied = properties.reduce((total, p) => total + p.occupied, 0);
  const pendingBills = bills.filter((b) => b.status === 'pending');
  const paidBills = bills.filter((b) => b.status === 'paid');

  // Rent collected for each billing month (paid bills only), last six months.
  const collections = lastSixMonths();
  const byKey = new Map(collections.map((c) => [c.key, c]));
  paidBills.forEach((b) => {
    const bucket = byKey.get(b.month);
    if (bucket) bucket.amount += b.total;
  });

  res.json({
    properties: degraded ? null : properties.length,
    rooms: degraded ? null : rooms,
    occupied: degraded ? null : occupied,
    vacant: degraded ? null : rooms - occupied,
    monthlyIncome: degraded ? null : properties.reduce((total, p) => total + p.occupied * p.monthlyRent, 0),
    pendingPayments: pendingBills.length,
    pendingAmount: sum(pendingBills),
    collectedThisMonth: collections[collections.length - 1].amount,
    openComplaints,
    collections,
    degraded,
    sources: { properties: 'user-service', bills: 'billing-service', complaints: 'billing-service' },
  });
};

module.exports = { getTenantSummary, getOwnerStats };
