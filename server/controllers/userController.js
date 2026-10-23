const User = require('../models/User');

const ROLES = ['admin', 'manager', 'viewer'];

const toSafeUser = (u) => {
  const obj = u.toObject ? u.toObject() : u;
  delete obj.password;
  return obj;
};

// Ensures at least one active admin remains after a change
const wouldRemoveLastAdmin = async (user, { role, isActive, deleting }) => {
  if (user.role !== 'admin' || !user.isActive) return false;
  const losingAdmin = deleting || (role && role !== 'admin') || isActive === false;
  if (!losingAdmin) return false;
  const activeAdmins = await User.countDocuments({ role: 'admin', isActive: true });
  return activeAdmins <= 1;
};

// @desc    List users (search, filter, paginate)
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res, next) => {
  try {
    const { search, role, isActive } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);

    const filter = {};
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: rx }, { email: rx }];
    }
    if (role && ROLES.includes(role)) filter.role = role;
    if (isActive === 'true' || isActive === 'false') filter.isActive = isActive === 'true';

    const [users, total] = await Promise.all([
      User.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, isActive } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    if (role && !ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    const exists = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (exists) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'manager',
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });
    res.status(201).json({ success: true, data: toSafeUser(user) });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user (password optional)
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { name, email, password, role, isActive } = req.body;
    const isSelf = user._id.equals(req.user._id);

    if (role !== undefined && !ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    if (isSelf && ((role && role !== user.role) || isActive === false)) {
      return res.status(400).json({ success: false, message: 'You cannot change your own role or deactivate yourself' });
    }
    if (await wouldRemoveLastAdmin(user, { role, isActive })) {
      return res.status(400).json({ success: false, message: 'At least one active admin is required' });
    }
    if (email && String(email).toLowerCase().trim() !== user.email) {
      const exists = await User.findOne({ email: String(email).toLowerCase().trim() });
      if (exists) {
        return res.status(400).json({ success: false, message: 'An account with this email already exists' });
      }
      user.email = email;
    }

    if (name !== undefined) user.name = name;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = Boolean(isActive);
    if (password) user.password = password;

    await user.save();
    res.json({ success: true, data: toSafeUser(user) });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user._id.equals(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }
    if (await wouldRemoveLastAdmin(user, { deleting: true })) {
      return res.status(400).json({ success: false, message: 'At least one active admin is required' });
    }
    await user.deleteOne();
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, getUser, createUser, updateUser, deleteUser };

