import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { signToken } from '../middleware/auth.js';
import {
  findUserByEmail,
  findUserById,
  verifyPassword,
  updateUser,
  touchLastLogin,
  userToApi,
} from '../data/users.js';

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await findUserByEmail(email, { withHash: true });

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!user.active) throw ApiError.unauthorized('Account is inactive');

  await touchLastLogin(user.id);

  res.json({
    success: true,
    data: { token: signToken(user), user: userToApi(user) },
  });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: userToApi(req.user) } });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await findUserById(req.user.id, { withHash: true });
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  if (!(await verifyPassword(currentPassword, user.password_hash))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  if (currentPassword === newPassword) {
    throw ApiError.badRequest('New password must be different from the current one');
  }
  await updateUser(user.id, { password: newPassword });
  res.json({ success: true, data: { message: 'Password updated' } });
});
