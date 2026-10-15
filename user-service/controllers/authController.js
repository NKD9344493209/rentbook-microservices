const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const ServiceError = require('../utils/ServiceError');

const publicUser = (user) => ({ _id: user._id, name: user.name, email: user.email, role: user.role });

// POST /api/auth/register
const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body || {};

  if (!name || !email || !password) {
    throw new ServiceError(400, 'Name, email and password are required.');
  }

  const exists = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (exists) {
    throw new ServiceError(409, 'An account already exists with that email.');
  }

  // Only tenant or owner can be chosen at sign-up; admin is never self-assigned.
  const safeRole = role === 'owner' ? 'owner' : 'tenant';
  const user = await User.create({ name, email, password, role: safeRole });

  res.status(201).json({ token: generateToken(user._id, user.role), user: publicUser(user) });
};

// POST /api/auth/login
const loginUser = async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    throw new ServiceError(400, 'Email and password are required.');
  }

  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user || !(await user.matchPassword(password))) {
    throw new ServiceError(401, 'That email and password combination does not match an account.');
  }

  res.json({ token: generateToken(user._id, user.role), user: publicUser(user) });
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json(req.user);
};

module.exports = { registerUser, loginUser, getMe };
