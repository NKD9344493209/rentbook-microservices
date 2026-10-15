const Complaint = require('../models/Complaint');
const Bill = require('../models/Bill');
const ServiceError = require('../utils/ServiceError');
const assertObjectId = require('../utils/assertObjectId');
const { attachUserData, markDegraded } = require('../utils/enrich');
const notifications = require('../utils/notificationClient');

const STATUSES = ['pending', 'in-progress', 'resolved'];

const findAccessibleComplaint = async (id, user) => {
  assertObjectId(id, 'complaint id');
  const complaint = await Complaint.findById(id);
  if (!complaint) throw new ServiceError(404, 'No complaint found with that id.');

  const mine = user.role === 'tenant' ? complaint.tenant : complaint.owner;
  if (String(mine) !== String(user._id)) {
    throw new ServiceError(403, 'You can only access your own complaints.');
  }
  return complaint;
};

// GET /api/complaints?status=...
const getComplaints = async (req, res) => {
  const filter = req.user.role === 'tenant' ? { tenant: req.user._id } : { owner: req.user._id };
  if (STATUSES.includes(req.query.status)) filter.status = req.query.status;

  const complaints = await Complaint.find(filter).sort('-createdAt');

  // INTER-SERVICE CALL: tenant names come from user-service.
  const { items, degraded } = await attachUserData(complaints, req.id);
  markDegraded(res, degraded);
  res.json(items);
};

// POST /api/complaints  (tenant only)
// The complaint is routed to whichever owner billed this tenant most
// recently, so the tenant never has to pick an owner by hand.
const createComplaint = async (req, res) => {
  const { title, description, priority, room } = req.body || {};

  if (!title || !description) {
    throw new ServiceError(400, 'Title and description are both required.');
  }

  const latestBill = await Bill.findOne({ tenant: req.user._id }).sort('-createdAt');
  if (!latestBill) {
    throw new ServiceError(
      409,
      'You are not linked to a property yet. Your owner links you automatically when they issue your first bill.'
    );
  }

  const complaint = await Complaint.create({
    title,
    description,
    priority,
    room: room || latestBill.room || '—',
    tenant: req.user._id,
    owner: latestBill.owner,
    property: latestBill.property,
  });

  // EVENT -> notification-service (owner's phone: new repair request)
  const { items } = await attachUserData([complaint], req.id).catch(() => ({ items: [complaint.toJSON()] }));
  notifications.emit('complaint.created', { tenant: items[0].tenant, owner: { _id: complaint.owner }, complaint: items[0] }, req.id);

  res.status(201).json(complaint);
};

// PUT /api/complaints/:id  (owner only) body: { status }
const updateComplaintStatus = async (req, res) => {
  const { status } = req.body || {};
  if (!STATUSES.includes(status)) {
    throw new ServiceError(400, 'Status must be pending, in-progress or resolved.');
  }

  const complaint = await findAccessibleComplaint(req.params.id, req.user);
  complaint.status = status;
  await complaint.save();

  // EVENT -> notification-service (tenant: in progress / resolved)
  notifications.emit('complaint.updated', { tenant: { _id: complaint.tenant }, owner: { _id: complaint.owner }, complaint: complaint.toJSON() }, req.id);

  res.json(complaint);
};

// DELETE /api/complaints/:id  (tenant only, while still pending)
const deleteComplaint = async (req, res) => {
  const complaint = await findAccessibleComplaint(req.params.id, req.user);
  if (complaint.status !== 'pending') {
    throw new ServiceError(409, 'Work has already started on this request, so it can no longer be withdrawn.');
  }

  await complaint.deleteOne();

  const { items } = await attachUserData([complaint], req.id).catch(() => ({ items: [complaint.toJSON()] }));
  notifications.emit('complaint.withdrawn', { tenant: items[0].tenant, owner: { _id: complaint.owner }, complaint: items[0] }, req.id);

  res.json({ message: 'Complaint withdrawn.', _id: complaint._id });
};

module.exports = { getComplaints, createComplaint, updateComplaintStatus, deleteComplaint };
