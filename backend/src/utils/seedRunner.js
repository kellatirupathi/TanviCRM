import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Purchase from '../models/Purchase.js';
import { buildSeed } from './seedData.js';
import { recomputeAll } from './segmentation.js';
import { ROLES } from '../config/constants.js';

/**
 * Wipe and re-seed the database. Returns summary counts.
 * Used by both the CLI seed script and the automated smoke test.
 */
export async function runSeed({ now = new Date(), adminEmail, adminPassword, log = () => {} } = {}) {
  log('Clearing existing data…');
  await Promise.all([
    User.deleteMany({}),
    Customer.deleteMany({}),
    Purchase.deleteMany({}),
  ]);

  // ── Users ────────────────────────────────────────────────
  const admin = new User({
    name: 'Tanvi Sree',
    email: adminEmail || 'admin@tanviboutique.in',
    role: ROLES.ADMIN,
    avatarColor: '#6B2C4F',
  });
  await admin.setPassword(adminPassword || 'Admin@123');
  await admin.save();

  const staff = new User({
    name: 'Counter Staff',
    email: 'staff@tanviboutique.in',
    role: ROLES.STAFF,
    avatarColor: '#B8860B',
  });
  await staff.setPassword('Staff@123');
  await staff.save();

  // ── Customers + purchases ────────────────────────────────
  const { customers, purchasesByIndex } = buildSeed(now);

  const createdCustomers = await Customer.insertMany(
    customers.map((c) => ({ ...c, createdBy: admin._id }))
  );

  const purchaseDocs = [];
  createdCustomers.forEach((cust, idx) => {
    for (const p of purchasesByIndex[idx]) {
      const amount = p.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
      purchaseDocs.push({
        customer: cust._id,
        date: p.date,
        items: p.items,
        amount: Math.round(amount * 100) / 100,
        paymentMethod: p.paymentMethod,
        invoiceNo: p.invoiceNo,
        notes: p.notes,
        createdBy: idx % 2 === 0 ? admin._id : staff._id,
      });
    }
  });
  if (purchaseDocs.length) await Purchase.insertMany(purchaseDocs);

  log('Recomputing aggregates & segments…');
  const { vipThreshold } = await recomputeAll();

  return {
    users: 2,
    customers: createdCustomers.length,
    purchases: purchaseDocs.length,
    vipThreshold,
  };
}
