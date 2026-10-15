const Bill = require('../models/Bill');
const ServiceError = require('../utils/ServiceError');
const assertObjectId = require('../utils/assertObjectId');
const userService = require('../utils/userServiceClient');
const { attachUserData, markDegraded } = require('../utils/enrich');
const notifications = require('../utils/notificationClient');

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};
const EDITABLE = ['rent', 'electricity', 'water', 'internet', 'dueDate', 'room'];

// Tenants may only touch their own bills; owners only the bills they issued.
const findAccessibleBill = async (id, user) => {
  assertObjectId(id, 'bill id');
  const bill = await Bill.findById(id);
  if (!bill) throw new ServiceError(404, 'No bill found with that id.');

  const mine = user.role === 'tenant' ? bill.tenant : bill.owner;
  if (String(mine) !== String(user._id)) {
    throw new ServiceError(403, 'You can only access your own bills.');
  }
  return bill;
};

// GET /api/bills?status=pending|paid
const getBills = async (req, res) => {
  const filter = req.user.role === 'tenant' ? { tenant: req.user._id } : { owner: req.user._id };
  if (['pending', 'paid'].includes(req.query.status)) filter.status = req.query.status;

  const bills = await Bill.find(filter).sort({ month: -1, createdAt: -1 });

  // INTER-SERVICE CALL: tenant + property names come from user-service.
  const { items, degraded } = await attachUserData(bills, req.id);
  markDegraded(res, degraded);
  res.json(items);
};

// GET /api/bills/:id
const getBill = async (req, res) => {
  const bill = await findAccessibleBill(req.params.id, req.user);
  const { items, degraded } = await attachUserData([bill], req.id);
  markDegraded(res, degraded);
  res.json(items[0]);
};

// POST /api/bills  (owner only)
const createBill = async (req, res) => {
  const { month, rent, electricity, water, internet, dueDate, tenant, property, room } = req.body || {};

  if (!month || rent === undefined || rent === '' || !dueDate || !tenant) {
    throw new ServiceError(400, 'Month, rent, due date and tenant are all required.');
  }
  if (!MONTH.test(month)) throw new ServiceError(400, 'Month must be in YYYY-MM format, e.g. 2026-10.');
  assertObjectId(tenant, 'tenant id');
  if (property) assertObjectId(property, 'property id');

  // INTER-SERVICE CALL 1: does this tenant exist, and are they a tenant?
  const tenantUser = await userService.getUser(tenant, req.id);
  if (!tenantUser) throw new ServiceError(404, 'That tenant does not exist in user-service.');
  if (tenantUser.role !== 'tenant') throw new ServiceError(400, 'Bills can only be issued to tenant accounts.');

  // INTER-SERVICE CALL 2: does the property exist and belong to this owner?
  let propertyDoc = null;
  if (property) {
    propertyDoc = await userService.getProperty(property, req.id);
    if (!propertyDoc) throw new ServiceError(404, 'That property does not exist in user-service.');
    if (String(propertyDoc.owner) !== String(req.user._id)) {
      throw new ServiceError(403, 'You can only bill for your own properties.');
    }
  }

  // Friendly duplicate check (the unique index is the real guarantee).
  if (await Bill.exists({ tenant, month })) {
    throw new ServiceError(409, `${tenantUser.name} already has a bill for ${monthLabel(month)}.`);
  }

  const bill = await Bill.create({
    month,
    rent,
    electricity,
    water,
    internet,
    dueDate,
    room,
    tenant,
    property: property || undefined,
    owner: req.user._id,
  });

  const response = {
    ...bill.toJSON(),
    tenant: { _id: tenantUser._id, name: tenantUser.name, email: tenantUser.email },
    property: propertyDoc ? { _id: propertyDoc._id, name: propertyDoc.name, address: propertyDoc.address } : null,
  };

  // EVENT -> notification-service (tenant gets "new bill" on Telegram / in-app)
  notifications.emit('bill.issued', { tenant: response.tenant, owner: { _id: req.user._id }, bill: response, property: response.property }, req.id);

  res.status(201).json(response);
};

// PUT /api/bills/:id  (owner only, pending bills only)
const updateBill = async (req, res) => {
  const bill = await findAccessibleBill(req.params.id, req.user);
  if (bill.status === 'paid') throw new ServiceError(409, 'A paid bill is a payment record and cannot be edited.');

  EDITABLE.forEach((field) => {
    if (req.body?.[field] !== undefined) bill[field] = req.body[field];
  });
  await bill.save();

  const { items, degraded } = await attachUserData([bill], req.id);
  markDegraded(res, degraded);
  res.json(items[0]);
};

// DELETE /api/bills/:id  (owner only, pending bills only)
const deleteBill = async (req, res) => {
  const bill = await findAccessibleBill(req.params.id, req.user);
  if (bill.status === 'paid') throw new ServiceError(409, 'A paid bill is a payment record and cannot be deleted.');

  await bill.deleteOne();
  res.json({ message: 'Bill deleted.', _id: bill._id });
};

// POST /api/bills/:id/pay  (tenant only)
const payBill = async (req, res) => {
  const bill = await findAccessibleBill(req.params.id, req.user);
  if (bill.status === 'paid') throw new ServiceError(400, 'This bill is already settled.');

  bill.status = 'paid';
  bill.paidOn = new Date();
  await bill.save();

  // EVENT -> notification-service (owner: payment received; tenant: confirmation)
  const { items } = await attachUserData([bill], req.id).catch(() => ({ items: [bill.toJSON()] }));
  notifications.emit('bill.paid', { tenant: items[0].tenant, owner: { _id: bill.owner }, bill: items[0], property: items[0].property }, req.id);

  res.json(bill);
};

module.exports = { getBills, getBill, createBill, updateBill, deleteBill, payBill };
