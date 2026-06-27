import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ROLES } from '../config/constants.js';

export const listUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).lean();
  res.json({
    success: true,
    data: {
      items: users.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.active,
        avatarColor: u.avatarColor,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
      })),
    },
  });
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const exists = await User.findOne({ email: String(email).toLowerCase() });
  if (exists) throw ApiError.conflict('A user with that email already exists');

  const user = new User({
    name,
    email,
    role: Object.values(ROLES).includes(role) ? role : ROLES.STAFF,
    avatarColor: '#6B2C4F',
  });
  await user.setPassword(password);
  await user.save();
  res.status(201).json({ success: true, data: { user: user.toSafeJSON() } });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  const { name, role, active, password } = req.body;
  if (name !== undefined) user.name = name;
  if (role !== undefined && Object.values(ROLES).includes(role)) user.role = role;

  // Guard: don't allow the last active admin to be demoted/deactivated.
  if (
    (active === false || (role && role !== ROLES.ADMIN)) &&
    user.role === ROLES.ADMIN
  ) {
    const otherAdmins = await User.countDocuments({
      _id: { $ne: user._id },
      role: ROLES.ADMIN,
      active: true,
    });
    if (otherAdmins === 0) {
      throw ApiError.badRequest('Cannot demote or deactivate the last active admin');
    }
  }
  if (active !== undefined) user.active = active;
  if (password) await user.setPassword(password);

  await user.save();
  res.json({ success: true, data: { user: user.toSafeJSON() } });
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    throw ApiError.badRequest('You cannot delete your own account');
  }
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === ROLES.ADMIN) {
    const otherAdmins = await User.countDocuments({
      _id: { $ne: user._id },
      role: ROLES.ADMIN,
      active: true,
    });
    if (otherAdmins === 0) throw ApiError.badRequest('Cannot delete the last active admin');
  }
  await user.deleteOne();
  res.json({ success: true, data: { message: 'User removed' } });
});
