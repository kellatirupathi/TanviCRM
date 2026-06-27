import { getSupabase } from '../config/supabase.js';
import { buildSeed } from './seedData.js';
import { hashPassword } from '../data/users.js';
import { recomputeAll } from './recomputeAll.js';
import { ROLES } from '../config/constants.js';

/**
 * Wipe and re-seed the Supabase database with the same demo data the Mongo
 * version used. Returns summary counts.
 */
export async function runSeed({ now = new Date(), adminEmail, adminPassword, log = () => {} } = {}) {
  const supabase = getSupabase();

  log('Clearing existing data…');
  // Order matters: purchases reference customers; both reference users.
  await supabase.from('purchases').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // ── Users ────────────────────────────────────────────────
  const adminHash = await hashPassword(adminPassword || 'Admin@123');
  const staffHash = await hashPassword('Staff@123');
  const { data: users, error: uErr } = await supabase
    .from('users')
    .insert([
      {
        name: 'Tanvi Sree',
        email: (adminEmail || 'admin@tanviboutique.in').toLowerCase(),
        password_hash: adminHash,
        role: ROLES.ADMIN,
        avatar_color: '#6B2C4F',
      },
      {
        name: 'Counter Staff',
        email: 'staff@tanviboutique.in',
        password_hash: staffHash,
        role: ROLES.STAFF,
        avatar_color: '#B8860B',
      },
    ])
    .select('id,role');
  if (uErr) throw uErr;
  const admin = users.find((u) => u.role === ROLES.ADMIN);
  const staff = users.find((u) => u.role === ROLES.STAFF);

  // ── Customers ────────────────────────────────────────────
  const { customers, purchasesByIndex } = buildSeed(now);
  const customerRows = customers.map((c) => ({
    name: c.name,
    phone: c.phone,
    email: c.email || '',
    address: c.address,
    style_preferences: c.stylePreferences,
    notes: c.notes,
    avatar_color: c.avatarColor,
    created_by: admin.id,
  }));

  const { data: insertedCustomers, error: cErr } = await supabase
    .from('customers')
    .insert(customerRows)
    .select('id');
  if (cErr) throw cErr;

  // ── Purchases ────────────────────────────────────────────
  const purchaseRows = [];
  insertedCustomers.forEach((cust, idx) => {
    for (const p of purchasesByIndex[idx]) {
      const amount =
        Math.round(p.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0) * 100) / 100;
      purchaseRows.push({
        customer_id: cust.id,
        date: new Date(p.date).toISOString(),
        items: p.items,
        amount,
        payment_method: p.paymentMethod,
        invoice_no: p.invoiceNo,
        notes: p.notes,
        created_by: idx % 2 === 0 ? admin.id : staff.id,
      });
    }
  });

  // Insert purchases in chunks (PostgREST payload limits).
  for (let i = 0; i < purchaseRows.length; i += 500) {
    const chunk = purchaseRows.slice(i, i + 500);
    const { error: pErr } = await supabase.from('purchases').insert(chunk);
    if (pErr) throw pErr;
  }

  log('Recomputing aggregates & segments…');
  const { vipThreshold } = await recomputeAll();

  return {
    users: 2,
    customers: insertedCustomers.length,
    purchases: purchaseRows.length,
    vipThreshold,
  };
}
