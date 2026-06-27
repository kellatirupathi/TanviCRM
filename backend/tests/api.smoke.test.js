import 'dotenv/config';
import { jest } from '@jest/globals';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { runSeed } from '../src/utils/seedRunner.js';
import { getSupabase, verifyConnection } from '../src/config/supabase.js';

jest.setTimeout(120000);

// These tests run against a LIVE Supabase project (there is no in-memory
// Postgres equivalent to mongodb-memory-server). They self-skip when the
// Supabase env vars are absent, so CI without credentials stays green.
const HAS_SUPABASE = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const describeIf = HAS_SUPABASE ? describe : describe.skip;

let app;
let adminToken;
let staffToken;
let supabase;

beforeAll(async () => {
  if (!HAS_SUPABASE) return;
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  process.env.JWT_EXPIRES_IN = '1h';

  await verifyConnection();
  supabase = getSupabase();

  await runSeed({
    now: new Date(),
    adminEmail: 'admin@tanviboutique.in',
    adminPassword: 'Admin@123',
  });

  app = createApp();
});

async function login(email, password) {
  return request(app).post('/api/auth/login').send({ email, password });
}
const countRows = async (table, filter) => {
  let q = supabase.from(table).select('id', { count: 'exact', head: true });
  if (filter) q = filter(q);
  const { count } = await q;
  return count || 0;
};

describeIf('Auth & RBAC', () => {
  test('rejects protected route without token', async () => {
    const res = await request(app).get('/api/customers');
    expect(res.status).toBe(401);
  });

  test('admin can log in', async () => {
    const res = await login('admin@tanviboutique.in', 'Admin@123');
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.role).toBe('admin');
    adminToken = res.body.data.token;
  });

  test('staff can log in', async () => {
    const res = await login('staff@tanviboutique.in', 'Staff@123');
    expect(res.status).toBe(200);
    staffToken = res.body.data.token;
  });

  test('rejects wrong password', async () => {
    const res = await login('admin@tanviboutique.in', 'wrong');
    expect(res.status).toBe(401);
  });

  test('staff is forbidden from user management', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });

  test('admin can list users', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(2);
  });
});

describeIf('Seeded data sanity', () => {
  test('seeded customers and purchases exist', async () => {
    expect(await countRows('customers')).toBeGreaterThanOrEqual(30);
    expect(await countRows('purchases')).toBeGreaterThan(40);
  });

  test('segments include VIP, Regular and New', async () => {
    const { data } = await supabase.from('customers').select('segment');
    const segs = [...new Set(data.map((d) => d.segment))];
    expect(segs).toEqual(expect.arrayContaining(['VIP', 'Regular', 'New']));
  });
});

describeIf('Customer CRUD + search', () => {
  let createdId;

  test('admin creates a customer (Inactive)', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Walkin Customer', phone: '9876543210', email: 'walkin@example.com', stylePreferences: ['Casual'], address: { city: 'Hyderabad' } });
    expect(res.status).toBe(201);
    createdId = res.body.data.customer._id;
    expect(res.body.data.customer.segment).toBe('Inactive');
  });

  test('rejects invalid phone', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Bad Phone', phone: '12345' });
    expect(res.status).toBe(400);
  });

  test('search by name returns the customer', async () => {
    const res = await request(app).get('/api/customers?q=Walkin').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.some((c) => c._id === createdId)).toBe(true);
  });

  test('logging a purchase promotes to New with correct spend', async () => {
    const res = await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ customer: createdId, items: [{ name: 'Cotton Printed Kurti', category: 'Kurtis', quantity: 2, unitPrice: 1250 }], paymentMethod: 'UPI' });
    expect(res.status).toBe(201);
    expect(res.body.data.purchase.amount).toBe(2500);

    const after = await request(app).get(`/api/customers/${createdId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(after.body.data.customer.totalSpend).toBe(2500);
    expect(after.body.data.customer.purchaseCount).toBe(1);
    expect(after.body.data.customer.segment).toBe('New');
  });

  test('second purchase promotes to Regular', async () => {
    await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ customer: createdId, items: [{ name: 'Pochampally Ikat Saree', category: 'Sarees', quantity: 1, unitPrice: 6800 }], paymentMethod: 'Card' });
    const after = await request(app).get(`/api/customers/${createdId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(after.body.data.customer.purchaseCount).toBe(2);
    expect(after.body.data.customer.totalSpend).toBe(9300);
    expect(['Regular', 'VIP']).toContain(after.body.data.customer.segment);
  });

  test('staff cannot delete a customer (admin only)', async () => {
    const res = await request(app).delete(`/api/customers/${createdId}`).set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });

  test('admin deletes customer and cascades purchases', async () => {
    const res = await request(app).delete(`/api/customers/${createdId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const remaining = await countRows('purchases', (q) => q.eq('customer_id', createdId));
    expect(remaining).toBe(0);
  });
});

describeIf('CSV export', () => {
  test('exports filtered customers as CSV', async () => {
    const res = await request(app).get('/api/customers/export?segment=VIP').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Name,Phone');
  });
});

describeIf('Analytics accuracy', () => {
  test('summary revenue equals sum of all purchase amounts', async () => {
    const res = await request(app).get('/api/analytics/summary').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const { data } = await supabase.from('purchases').select('amount');
    const expected = Math.round(data.reduce((s, r) => s + Number(r.amount), 0) * 100) / 100;
    expect(res.body.data.revenue.allTime).toBeCloseTo(expected, 1);
    expect(res.body.data.customers.total).toBeGreaterThanOrEqual(30);
  });

  test('repeat rate is consistent with paying/repeat counts', async () => {
    const res = await request(app).get('/api/analytics/summary').set('Authorization', `Bearer ${adminToken}`);
    const { paying, repeat, repeatRatePct } = res.body.data.customers;
    const expected = paying ? Math.round((repeat / paying) * 100 * 100) / 100 : 0;
    expect(repeatRatePct).toBeCloseTo(expected, 1);
  });

  test('top customers are sorted by spend descending', async () => {
    const res = await request(app).get('/api/analytics/top-customers?limit=5').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const spends = res.body.data.items.map((c) => c.totalSpend);
    expect(spends).toEqual([...spends].sort((a, b) => b - a));
  });

  test('top categories returns revenue per category', async () => {
    const res = await request(app).get('/api/analytics/top-categories').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.items[0]).toHaveProperty('revenue');
  });

  test('revenue trend returns a continuous 12-month series', async () => {
    const res = await request(app).get('/api/analytics/revenue-trend?months=12').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(12);
  });
});

describeIf('VIP segment stays consistent across the cohort (regression)', () => {
  test('stored VIP set matches the recomputed threshold for every customer', async () => {
    const { data: payers } = await supabase
      .from('customers').select('total_spend').gt('purchase_count', 0).order('total_spend', { ascending: false });
    const cutoffCount = Math.max(1, Math.ceil(payers.length * 0.1));
    const threshold = Number(payers[cutoffCount - 1].total_spend);

    const { data: all } = await supabase.from('customers').select('segment,total_spend,purchase_count');
    for (const c of all) {
      const shouldBeVip = c.purchase_count > 0 && Number(c.total_spend) >= threshold;
      if (shouldBeVip) expect(c.segment).toBe('VIP');
      else expect(c.segment).not.toBe('VIP');
    }
  });
});

// Always-present guard so the suite isn't "empty" when Supabase isn't configured.
describe('migration test harness', () => {
  test(HAS_SUPABASE ? 'Supabase configured — full suite ran' : 'Supabase not configured — suite skipped', () => {
    expect(true).toBe(true);
  });
});
