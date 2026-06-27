import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { resegmentCohort } from '../utils/segmentation.js';
import * as Customers from '../data/customers.js';
import { purchasesForCustomer } from '../data/purchases.js';

const AVATAR_COLORS = [
  '#6B2C4F', '#A8456B', '#8E5572', '#B8860B', '#7A6C5D',
  '#4A5859', '#9C6644', '#5C4B51', '#856084', '#3E5641',
];
const pickColor = (seed) =>
  AVATAR_COLORS[Math.abs([...String(seed)].reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length];

export const listCustomers = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 12));
  const { items, total } = await Customers.listCustomers(req.query, { page, limit });
  res.json({
    success: true,
    data: {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    },
  });
});

export const getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customers.getCustomer(req.params.id);
  if (!customer) throw ApiError.notFound('Customer not found');

  const purchases = await purchasesForCustomer(req.params.id);

  // Category breakdown for this customer (profile page).
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
  const customer = await Customers.createCustomer(body, req.user.id);
  res.status(201).json({ success: true, data: { customer } });
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const existing = await Customers.getCustomerRaw(req.params.id);
  if (!existing) throw ApiError.notFound('Customer not found');
  const customer = await Customers.updateCustomer(req.params.id, pickCustomerFields(req.body));
  res.json({ success: true, data: { customer } });
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  const existing = await Customers.getCustomerRaw(req.params.id);
  if (!existing) throw ApiError.notFound('Customer not found');
  const wasPaying = existing.purchase_count > 0;
  await Customers.deleteCustomer(req.params.id); // purchases cascade via FK
  if (wasPaying) await resegmentCohort();
  res.json({ success: true, data: { message: 'Customer and purchases removed' } });
});

/**
 * Export the *filtered* customer list to CSV (same filters as the list, no
 * pagination).
 */
export const exportCustomersCsv = asyncHandler(async (req, res) => {
  const customers = await Customers.listCustomersForExport(req.query);

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

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');

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
