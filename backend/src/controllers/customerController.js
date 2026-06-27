import Customer from '../models/Customer.js';
import Purchase from '../models/Purchase.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { resegmentCohort } from '../utils/segmentation.js';
import { finiteNumber, startOfDay, endOfDay, range } from '../utils/queryParams.js';
import { SEGMENTS } from '../config/constants.js';

const AVATAR_COLORS = [
  '#6B2C4F', '#A8456B', '#8E5572', '#B8860B', '#7A6C5D',
  '#4A5859', '#9C6644', '#5C4B51', '#856084', '#3E5641',
];
const pickColor = (seed) =>
  AVATAR_COLORS[Math.abs([...seed].reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length];

/**
 * Build the Mongo filter for the customer list from query params.
 * Supports: q (name/phone/email), segment, purchase date range, spend range.
 */
function buildCustomerQuery(query) {
  const filter = {};
  const { q, segment, minSpend, maxSpend, purchaseFrom, purchaseTo } = query;

  if (q && q.trim()) {
    const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { phone: rx }, { email: rx }];
  }
  if (segment && Object.values(SEGMENTS).includes(segment)) {
    filter.segment = segment;
  }
  const spend = range(finiteNumber(minSpend), finiteNumber(maxSpend));
  if (spend) filter.totalSpend = spend;

  const lastPurchase = range(startOfDay(purchaseFrom), endOfDay(purchaseTo));
  if (lastPurchase) filter.lastPurchaseAt = lastPurchase;

  return filter;
}

const SORT_MAP = {
  name: { name: 1 },
  recent: { lastPurchaseAt: -1, createdAt: -1 },
  spend: { totalSpend: -1 },
  purchases: { purchaseCount: -1 },
  created: { createdAt: -1 },
};

export const listCustomers = asyncHandler(async (req, res) => {
  const filter = buildCustomerQuery(req.query);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 12));
  const sort = SORT_MAP[req.query.sort] || SORT_MAP.recent;

  const [items, total] = await Promise.all([
    Customer.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Customer.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    },
  });
});

export const getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id).lean();
  if (!customer) throw ApiError.notFound('Customer not found');

  const purchases = await Purchase.find({ customer: customer._id })
    .sort({ date: -1 })
    .lean();

  // Category breakdown for this customer (for the profile page).
  const catMap = {};
  for (const p of purchases) {
    for (const it of p.items) {
      catMap[it.category] = (catMap[it.category] || 0) + it.quantity * it.unitPrice;
    }
  }
  const categoryBreakdown = Object.entries(catMap)
    .map(([category, value]) => ({ category, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);

  res.json({
    success: true,
    data: {
      customer,
      purchases,
      stats: {
        avgOrderValue: purchases.length
          ? Math.round((customer.totalSpend / purchases.length) * 100) / 100
          : 0,
        categoryBreakdown,
      },
    },
  });
});

export const createCustomer = asyncHandler(async (req, res) => {
  const body = pickCustomerFields(req.body);
  body.avatarColor = pickColor(body.name || 'C');
  body.createdBy = req.user._id;
  const customer = await Customer.create(body);
  res.status(201).json({ success: true, data: { customer } });
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw ApiError.notFound('Customer not found');
  Object.assign(customer, pickCustomerFields(req.body));
  await customer.save();
  res.json({ success: true, data: { customer } });
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw ApiError.notFound('Customer not found');
  const wasPaying = customer.purchaseCount > 0;
  await Purchase.deleteMany({ customer: customer._id });
  await customer.deleteOne();
  // Removing a paying customer changes the cohort and can shift the VIP
  // threshold, so re-segment the remaining customers.
  if (wasPaying) await resegmentCohort();
  res.json({ success: true, data: { message: 'Customer and purchases removed' } });
});

/**
 * Export the *filtered* customer list to CSV (respects the same query params
 * as the list endpoint, but ignores pagination).
 */
export const exportCustomersCsv = asyncHandler(async (req, res) => {
  const filter = buildCustomerQuery(req.query);
  const sort = SORT_MAP[req.query.sort] || SORT_MAP.spend;
  const customers = await Customer.find(filter).sort(sort).lean();

  const headers = [
    'Name', 'Phone', 'Email', 'City', 'Segment',
    'Total Spend (INR)', 'Purchases', 'First Purchase', 'Last Purchase', 'Style Preferences',
  ];
  const rows = customers.map((c) => [
    c.name,
    c.phone,
    c.email || '',
    c.address?.city || '',
    c.segment,
    c.totalSpend,
    c.purchaseCount,
    c.firstPurchaseAt ? new Date(c.firstPurchaseAt).toISOString().slice(0, 10) : '',
    c.lastPurchaseAt ? new Date(c.lastPurchaseAt).toISOString().slice(0, 10) : '',
    (c.stylePreferences || []).join('; '),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="tanvicrm-customers-${new Date().toISOString().slice(0, 10)}.csv"`
  );
  res.send('﻿' + csv); // BOM for Excel UTF-8.
});

// ── helpers ──────────────────────────────────────────────────
function csvCell(value) {
  const s = value == null ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function pickCustomerFields(body) {
  const out = {};
  for (const k of ['name', 'phone', 'email', 'notes', 'stylePreferences']) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  if (body.address) {
    out.address = {
      line: body.address.line ?? '',
      city: body.address.city ?? 'Hyderabad',
      pincode: body.address.pincode ?? '',
    };
  }
  return out;
}
