import { jest } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { runSeed } from '../src/utils/seedRunner.js';
import Customer from '../src/models/Customer.js';
import Purchase from '../src/models/Purchase.js';

jest.setTimeout(120000);

let mongo;
let app;
let adminToken;
let staffToken;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_EXPIRES_IN = '1h';

  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  await runSeed({
    now: new Date(),
    adminEmail: 'admin@tanviboutique.in',
    adminPassword: 'Admin@123',
  });

  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

async function login(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res;
}

describe('Auth & RBAC', () => {
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
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });

  test('admin can list users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(2);
  });
});

describe('Seeded data sanity', () => {
  test('seeded customers and purchases exist', async () => {
    const customers = await Customer.countDocuments();
    const purchases = await Purchase.countDocuments();
    expect(customers).toBeGreaterThanOrEqual(30);
    expect(purchases).toBeGreaterThan(40);
  });

  test('segments include VIP, Regular and New', async () => {
    const segs = await Customer.distinct('segment');
    expect(segs).toEqual(expect.arrayContaining(['VIP', 'Regular', 'New']));
  });
});

describe('Customer CRUD + search', () => {
  let createdId;

  test('admin creates a customer', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Walkin Customer',
        phone: '9876543210',
        email: 'walkin@example.com',
        stylePreferences: ['Casual'],
        address: { city: 'Hyderabad' },
      });
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
    const res = await request(app)
      .get('/api/customers?q=Walkin')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.some((c) => c._id === createdId)).toBe(true);
  });

  test('logging a purchase updates spend and segment to New', async () => {
    const res = await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        customer: createdId,
        items: [{ name: 'Cotton Printed Kurti', category: 'Kurtis', quantity: 2, unitPrice: 1250 }],
        paymentMethod: 'UPI',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.purchase.amount).toBe(2500);

    const cust = await Customer.findById(createdId).lean();
    expect(cust.totalSpend).toBe(2500);
    expect(cust.purchaseCount).toBe(1);
    expect(cust.segment).toBe('New');
  });

  test('second purchase promotes to Regular', async () => {
    await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        customer: createdId,
        items: [{ name: 'Pochampally Ikat Saree', category: 'Sarees', quantity: 1, unitPrice: 6800 }],
        paymentMethod: 'Card',
      });
    const cust = await Customer.findById(createdId).lean();
    expect(cust.purchaseCount).toBe(2);
    expect(cust.totalSpend).toBe(9300);
    expect(['Regular', 'VIP']).toContain(cust.segment);
  });

  test('staff cannot delete a customer (admin only)', async () => {
    const res = await request(app)
      .delete(`/api/customers/${createdId}`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });

  test('admin deletes customer and cascades purchases', async () => {
    const res = await request(app)
      .delete(`/api/customers/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const remaining = await Purchase.countDocuments({ customer: createdId });
    expect(remaining).toBe(0);
  });
});

describe('CSV export', () => {
  test('exports filtered customers as CSV', async () => {
    const res = await request(app)
      .get('/api/customers/export?segment=VIP')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Name,Phone');
  });
});

describe('Analytics accuracy', () => {
  test('summary revenue equals sum of all purchase amounts', async () => {
    const res = await request(app)
      .get('/api/analytics/summary')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    const agg = await Purchase.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const expected = Math.round((agg[0]?.total || 0) * 100) / 100;
    expect(res.body.data.revenue.allTime).toBeCloseTo(expected, 1);
    expect(res.body.data.customers.total).toBeGreaterThanOrEqual(30);
  });

  test('repeat rate is consistent with paying/repeat counts', async () => {
    const res = await request(app)
      .get('/api/analytics/summary')
      .set('Authorization', `Bearer ${adminToken}`);
    const { paying, repeat, repeatRatePct } = res.body.data.customers;
    const expected = paying ? Math.round((repeat / paying) * 100 * 100) / 100 : 0;
    expect(repeatRatePct).toBeCloseTo(expected, 1);
  });

  test('top customers are sorted by spend descending', async () => {
    const res = await request(app)
      .get('/api/analytics/top-customers?limit=5')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const spends = res.body.data.items.map((c) => c.totalSpend);
    const sorted = [...spends].sort((a, b) => b - a);
    expect(spends).toEqual(sorted);
  });

  test('top categories returns revenue per category', async () => {
    const res = await request(app)
      .get('/api/analytics/top-categories')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.items[0]).toHaveProperty('revenue');
  });

  test('revenue trend returns a continuous series', async () => {
    const res = await request(app)
      .get('/api/analytics/revenue-trend?months=12')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(12);
  });
});

describe('VIP segment stays consistent across the cohort (regression)', () => {
  // Proves the cohort-relative bug fix: a new top spender must demote the
  // previously-lowest VIP, and removing a top spender must re-promote.
  const auth = () => `Bearer ${adminToken}`;

  async function vipNames() {
    const vips = await Customer.find({ segment: 'VIP' }).select('name totalSpend').lean();
    return vips.map((v) => v.name).sort();
  }

  test('stored VIP set matches the recomputed threshold for every customer', async () => {
    // Independently recompute what the VIP set *should* be and compare to what
    // is stored on each customer document.
    const payers = await Customer.find({ purchaseCount: { $gt: 0 } })
      .select('totalSpend')
      .sort({ totalSpend: -1 })
      .lean();
    const cutoffCount = Math.max(1, Math.ceil(payers.length * 0.1));
    const threshold = payers[cutoffCount - 1].totalSpend;

    const all = await Customer.find().select('segment totalSpend purchaseCount').lean();
    for (const c of all) {
      const shouldBeVip = c.purchaseCount > 0 && c.totalSpend >= threshold;
      if (shouldBeVip) expect(c.segment).toBe('VIP');
      else expect(c.segment).not.toBe('VIP');
    }
  });

  test('a new top spender re-segments the whole cohort', async () => {
    // Find the current highest spender's total, then create a customer who
    // blows past it — this raises the threshold and should demote the weakest VIP.
    const top = await Customer.findOne().sort({ totalSpend: -1 }).lean();
    const beforeVips = await vipNames();

    const created = await request(app)
      .post('/api/customers')
      .set('Authorization', auth())
      .send({ name: 'Mega Spender Regression', phone: '9111111111' });
    const id = created.body.data.customer._id;

    await request(app)
      .post('/api/purchases')
      .set('Authorization', auth())
      .send({
        customer: id,
        paymentMethod: 'Card',
        items: [{ name: 'Couture Set', category: 'Bridal Wear', quantity: 1, unitPrice: top.totalSpend + 100000 }],
      });

    const mega = await Customer.findById(id).lean();
    expect(mega.segment).toBe('VIP');

    // The whole cohort was re-evaluated: the stored VIP set must still equal the
    // freshly-recomputed set (no stale VIPs left behind).
    const payers = await Customer.find({ purchaseCount: { $gt: 0 } })
      .select('totalSpend').sort({ totalSpend: -1 }).lean();
    const threshold = payers[Math.max(1, Math.ceil(payers.length * 0.1)) - 1].totalSpend;
    const storedVips = await Customer.find({ segment: 'VIP' }).select('totalSpend').lean();
    for (const v of storedVips) expect(v.totalSpend).toBeGreaterThanOrEqual(threshold);

    // cleanup so other suites see the original cohort
    await request(app).delete(`/api/customers/${id}`).set('Authorization', auth());
    const afterVips = await vipNames();
    expect(afterVips).toEqual(beforeVips);
  });
});
