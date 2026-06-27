import bcrypt from 'bcryptjs';
import { getSupabase } from '../config/supabase.js';
import { userToApi } from './mappers.js';

const TABLE = 'users';

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}
export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export async function findUserByEmail(email, { withHash = false } = {}) {
  const cols = withHash ? '*' : 'id,name,email,role,avatar_color,active,last_login_at,created_at';
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select(cols)
    .eq('email', String(email).toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function findUserById(id, { withHash = false } = {}) {
  const cols = withHash ? '*' : 'id,name,email,role,avatar_color,active,last_login_at,created_at';
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select(cols)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function listUsers() {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createUser({ name, email, password, role, avatarColor = '#6B2C4F' }) {
  const password_hash = await hashPassword(password);
  const { data, error } = await getSupabase()
    .from(TABLE)
    .insert({ name, email: String(email).toLowerCase(), password_hash, role, avatar_color: avatarColor })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateUser(id, patch) {
  const update = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.role !== undefined) update.role = patch.role;
  if (patch.active !== undefined) update.active = patch.active;
  if (patch.avatarColor !== undefined) update.avatar_color = patch.avatarColor;
  if (patch.password) update.password_hash = await hashPassword(patch.password);
  if (patch.lastLoginAt !== undefined) update.last_login_at = patch.lastLoginAt;

  const { data, error } = await getSupabase()
    .from(TABLE)
    .update(update)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteUser(id) {
  const { error } = await getSupabase().from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export async function countAdmins({ excludeId } = {}) {
  let q = getSupabase()
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin')
    .eq('active', true);
  if (excludeId) q = q.neq('id', excludeId);
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}

export async function touchLastLogin(id) {
  await updateUser(id, { lastLoginAt: new Date().toISOString() });
}

export { userToApi };
