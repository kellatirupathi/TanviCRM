import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ROLES } from '../config/constants.js';
import * as Users from '../data/users.js';

export const listUsers = asyncHandler(async (_req, res) => {
  const rows = await Users.listUsers();
  res.json({ success: true, data: { items: rows.map(Users.userToApi) } });
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const exists = await Users.findUserByEmail(email);
  if (exists) throw ApiError.conflict('A user with that email already exists');

  const row = await Users.createUser({
    name,
    email,
    password,
    role: Object.values(ROLES).includes(role) ? role : ROLES.STAFF,
  });
  res.status(201).json({ success: true, data: { user: Users.userToApi(row) } });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await Users.findUserById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  const { name, role, active, password } = req.body;

  // Guard: don't allow the last active admin to be demoted/deactivated.
  if (
    (active === false || (role && role !== ROLES.ADMIN)) &&
    user.role === ROLES.ADMIN
  ) {
    const otherAdmins = await Users.countAdmins({ excludeId: user.id });
    if (otherAdmins === 0) {
      throw ApiError.badRequest('Cannot demote or deactivate the last active admin');
    }
  }

  const patch = {};
  if (name !== undefined) patch.name = name;
  if (role !== undefined && Object.values(ROLES).includes(role)) patch.role = role;
  if (active !== undefined) patch.active = active;
  if (password) patch.password = password;

  const updated = await Users.updateUser(user.id, patch);
  res.json({ success: true, data: { user: Users.userToApi(updated) } });
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user.id)) {
    throw ApiError.badRequest('You cannot delete your own account');
  }
  const user = await Users.findUserById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === ROLES.ADMIN) {
    const otherAdmins = await Users.countAdmins({ excludeId: user.id });
    if (otherAdmins === 0) throw ApiError.badRequest('Cannot delete the last active admin');
  }
  await Users.deleteUser(user.id);
  res.json({ success: true, data: { message: 'User removed' } });
});
