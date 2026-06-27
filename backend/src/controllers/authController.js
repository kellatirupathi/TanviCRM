import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { signToken } from '../middleware/auth.js';

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase() }).select(
    '+passwordHash'
  );

  if (!user || !(await user.verifyPassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!user.active) throw ApiError.unauthorized('Account is inactive');

  user.lastLoginAt = new Date();
  await user.save();

  res.json({
    success: true,
    data: { token: signToken(user), user: user.toSafeJSON() },
  });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user.toSafeJSON() } });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  if (!(await user.verifyPassword(currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  if (currentPassword === newPassword) {
    throw ApiError.badRequest('New password must be different from the current one');
  }
  await user.setPassword(newPassword);
  await user.save();
  res.json({ success: true, data: { message: 'Password updated' } });
});
