const mongoose = require('mongoose');
const User = require('../models/User');
const Property = require('../models/Property');
const ServiceError = require('../utils/ServiceError');
const assertObjectId = require('../utils/assertObjectId');

/* These endpoints are called by billing-service, never by the browser.
   They are protected by middleware/serviceAuth.js (x-service-key). */

const PUBLIC_FIELDS = 'name email role'; // never send password hashes to another service
const validIds = (ids) => (Array.isArray(ids) ? ids.filter((id) => mongoose.isValidObjectId(id)) : []);

// GET /internal/users/:id
const getUserById = async (req, res) => {
  assertObjectId(req.params.id, 'user id');
  const user = await User.findById(req.params.id).select(PUBLIC_FIELDS);
  if (!user) throw new ServiceError(404, 'No user found with that id.');
  res.json(user);
};

// POST /internal/users/batch   body: { "ids": ["...", "..."] }
// One request for many users instead of one request per bill (avoids N+1 calls).
const getUsersByIds = async (req, res) => {
  const users = await User.find({ _id: { $in: validIds(req.body?.ids) } }).select(PUBLIC_FIELDS);
  res.json(users);
};

// GET /internal/properties?owner=<ownerId>
const getPropertiesByOwner = async (req, res) => {
  assertObjectId(req.query.owner, 'owner id');
  res.json(await Property.find({ owner: req.query.owner }));
};

// GET /internal/properties/:id
const getPropertyById = async (req, res) => {
  assertObjectId(req.params.id, 'property id');
  const property = await Property.findById(req.params.id);
  if (!property) throw new ServiceError(404, 'No property found with that id.');
  res.json(property);
};

// POST /internal/properties/batch   body: { "ids": [...] }
const getPropertiesByIds = async (req, res) => {
  res.json(await Property.find({ _id: { $in: validIds(req.body?.ids) } }).select('name address owner'));
};

module.exports = { getUserById, getUsersByIds, getPropertiesByOwner, getPropertyById, getPropertiesByIds };
