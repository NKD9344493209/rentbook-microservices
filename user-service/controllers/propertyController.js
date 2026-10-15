const Property = require('../models/Property');
const ServiceError = require('../utils/ServiceError');
const assertObjectId = require('../utils/assertObjectId');
const billingService = require('../utils/billingServiceClient');

const EDITABLE = ['name', 'address', 'rooms', 'occupied', 'monthlyRent'];

// Loads a property and confirms the logged-in owner owns it.
const findOwnedProperty = async (id, ownerId) => {
  assertObjectId(id, 'property id');
  const property = await Property.findById(id);
  if (!property) throw new ServiceError(404, 'No property found with that id.');
  if (property.owner.toString() !== ownerId.toString()) {
    throw new ServiceError(403, 'You can only manage your own properties.');
  }
  return property;
};

// GET /api/properties
const getProperties = async (req, res) => {
  const properties = await Property.find({ owner: req.user._id }).sort('-createdAt');
  res.json(properties);
};

// GET /api/properties/:id
const getProperty = async (req, res) => {
  res.json(await findOwnedProperty(req.params.id, req.user._id));
};

// POST /api/properties
const createProperty = async (req, res) => {
  const { name, address, rooms, occupied, monthlyRent } = req.body || {};

  if (!name || !address || !rooms || monthlyRent === undefined || monthlyRent === '') {
    throw new ServiceError(400, 'Name, address, rooms and rent are all required.');
  }

  const property = await Property.create({
    name,
    address,
    rooms,
    occupied: occupied || 0,
    monthlyRent,
    owner: req.user._id,
  });

  res.status(201).json(property);
};

// PUT /api/properties/:id
const updateProperty = async (req, res) => {
  const property = await findOwnedProperty(req.params.id, req.user._id);

  // Only these fields may change. This stops a request from rewriting `owner`.
  EDITABLE.forEach((field) => {
    if (req.body?.[field] !== undefined) property[field] = req.body[field];
  });

  await property.save();
  res.json(property);
};

// DELETE /api/properties/:id
// INTER-SERVICE CALL: before deleting, ask billing-service whether this
// property still has unpaid bills. If billing-service can't be reached we
// refuse to delete (fail safe) instead of risking orphaned bills.
const deleteProperty = async (req, res) => {
  const property = await findOwnedProperty(req.params.id, req.user._id);

  const summary = await billingService.getPropertyBillSummary(property._id, req.id);
  if (summary && summary.pendingBills > 0) {
    throw new ServiceError(
      409,
      `${property.name} still has ${summary.pendingBills} unpaid bill(s). Settle or delete them before removing the property.`
    );
  }

  await property.deleteOne();
  res.json({ message: 'Property removed.', checkedWith: 'billing-service', billsOnRecord: summary?.totalBills ?? 0 });
};

module.exports = { getProperties, getProperty, createProperty, updateProperty, deleteProperty };
