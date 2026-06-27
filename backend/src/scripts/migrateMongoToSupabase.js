/* eslint-disable no-console */
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { getSupabase, verifyConnection } from '../config/supabase.js';
import { recomputeAll } from '../utils/recomputeAll.js';

// ──────────────────────────────────────────────────────────────────────
// One-time copy of the existing MongoDB Atlas data into Supabase.
// READ-ONLY against MongoDB — it never deletes or modifies Atlas data.
// It WIPES the Supabase tables first, then inserts the Mongo data, preserving
// relationships via an old-Mongo-id → new-UUID map.
//
// Usage:  npm run migrate:mongo
// Requires in .env:  MONGO_URI (source), SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (target)
// ──────────────────────────────────────────────────────────────────────

const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI (source MongoDB) is required for migration');

  await verifyConnection();
  const supabase = getSupabase();
  console.log('✓ Supabase reachable');

  const mongo = new MongoClient(mongoUri);
  await mongo.connect();
  const db = mongo.db(); // db name comes from the URI (/tanvicrm)
  console.log(`✓ Connected to MongoDB: ${db.databaseName}`);

  const mUsers = await db.collection('users').find().toArray();
  const mCustomers = await db.collection('customers').find().toArray();
  const mPurchases = await db.collection('purchases').find().toArray();
  console.log(`  Source counts → users: ${mUsers.length}, customers: ${mCustomers.length}, purchases: ${mPurchases.length}`);

  if (mUsers.length === 0 && mCustomers.length === 0) {
    console.log('Nothing to migrate (source is empty). Aborting.');
    await mongo.close();
    process.exit(0);
  }

  // ── Wipe Supabase target ──
  console.log('Clearing Supabase tables…');
  await supabase.from('purchases').delete().neq('id', ZERO_UUID);
  await supabase.from('customers').delete().neq('id', ZERO_UUID);
  await supabase.from('users').delete().neq('id', ZERO_UUID);

  // ── Users ──
  const userRows = mUsers.map((u) => ({
    name: u.name,
    email: String(u.email).toLowerCase(),
    password_hash: u.passwordHash, // bcrypt hash carried over verbatim
    role: u.role || 'staff',
    avatar_color: u.avatarColor || '#6B2C4F',
    active: u.active !== false,
    last_login_at: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : null,
    created_at: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
  }));
  const userIdMap = new Map(); // mongoId -> new uuid
  if (userRows.length) {
    const { data, error } = await supabase.from('users').insert(userRows).select('id,email');
    if (error) throw error;
    // Map by email (unique) back to the source mongo _id.
    const byEmail = new Map(data.map((r) => [r.email, r.id]));
    for (const u of mUsers) userIdMap.set(String(u._id), byEmail.get(String(u.email).toLowerCase()));
  }
  console.log(`  ✓ Migrated ${userRows.length} users`);

  // ── Customers ──  (insert one batch, keep order to map ids back)
  const customerIdMap = new Map();
  const customerRows = mCustomers.map((c) => ({
    name: c.name,
    phone: c.phone,
    email: c.email || '',
    address: c.address || { line: '', city: 'Hyderabad', pincode: '' },
    style_preferences: c.stylePreferences || [],
    notes: c.notes || '',
    avatar_color: c.avatarColor || '#6B2C4F',
    total_spend: c.totalSpend || 0,
    purchase_count: c.purchaseCount || 0,
    first_purchase_at: c.firstPurchaseAt ? new Date(c.firstPurchaseAt).toISOString() : null,
    last_purchase_at: c.lastPurchaseAt ? new Date(c.lastPurchaseAt).toISOString() : null,
    segment: c.segment || 'Inactive',
    created_by: c.createdBy ? userIdMap.get(String(c.createdBy)) || null : null,
    created_at: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
  }));

  // Insert in chunks but preserve index alignment so we can map ids back.
  let insertedCustomers = [];
  for (let i = 0; i < customerRows.length; i += 500) {
    const chunk = customerRows.slice(i, i + 500);
    const { data, error } = await supabase.from('customers').insert(chunk).select('id');
    if (error) throw error;
    insertedCustomers = insertedCustomers.concat(data);
  }
  mCustomers.forEach((c, idx) => customerIdMap.set(String(c._id), insertedCustomers[idx].id));
  console.log(`  ✓ Migrated ${insertedCustomers.length} customers`);

  // ── Purchases ──
  const purchaseRows = mPurchases.map((p) => ({
    customer_id: customerIdMap.get(String(p.customer)),
    date: p.date ? new Date(p.date).toISOString() : new Date().toISOString(),
    items: (p.items || []).map((it) => ({
      name: it.name,
      category: it.category,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
    })),
    amount: p.amount || 0,
    payment_method: p.paymentMethod || 'UPI',
    invoice_no: p.invoiceNo || null,
    notes: p.notes || '',
    created_by: p.createdBy ? userIdMap.get(String(p.createdBy)) || null : null,
    created_at: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
  })).filter((r) => r.customer_id); // skip orphaned purchases

  for (let i = 0; i < purchaseRows.length; i += 500) {
    const chunk = purchaseRows.slice(i, i + 500);
    const { error } = await supabase.from('purchases').insert(chunk);
    if (error) throw error;
  }
  console.log(`  ✓ Migrated ${purchaseRows.length} purchases`);

  // ── Recompute aggregates + segments to be safe ──
  console.log('Recomputing aggregates & segments…');
  const { vipThreshold } = await recomputeAll();

  await mongo.close();
  console.log('\n✓ Migration complete.');
  console.log(`   VIP cutoff: ₹${Number.isFinite(vipThreshold) ? vipThreshold.toLocaleString('en-IN') : '—'}`);
  console.log('   MongoDB Atlas data was NOT modified.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('✗ Migration failed:', err.message || err);
  process.exit(1);
});
