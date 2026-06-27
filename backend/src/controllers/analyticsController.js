import { asyncHandler } from '../middleware/asyncHandler.js';
import { getSupabase } from '../config/supabase.js';
import { SEGMENTS } from '../config/constants.js';
import { computeVipThreshold } from '../utils/segmentation.js';
import {
  countCustomers, countPaying, countRepeat, topCustomers,
} from '../data/customers.js';

const round = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Period boundaries from "now" (or an asOf override for tests).
function periodBounds(asOf) {
  const now = asOf ? new Date(asOf) : new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const quarter = Math.floor(now.getMonth() / 3);
  const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPrevMonth = new Date(startOfMonth.getTime() - 1);
  return { now, startOfMonth, startOfQuarter, startOfYear, startOfPrevMonth, endOfPrevMonth };
}

async function revenueBetween(start, end) {
  const { data, error } = await getSupabase().rpc('revenue_between', {
    p_start: start.toISOString(),
    p_end: end ? end.toISOString() : null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { total: round(row?.total || 0), count: Number(row?.count || 0) };
}

export const getSummary = asyncHandler(async (req, res) => {
  const b = periodBounds(req.query.asOf);

  const [
    monthRevenue, quarterRevenue, prevMonthRevenue, yearRevenue, allTime,
    totalCustomers, paying, repeat, vipThreshold, segRows,
  ] = await Promise.all([
    revenueBetween(b.startOfMonth),
    revenueBetween(b.startOfQuarter),
    revenueBetween(b.startOfPrevMonth, b.endOfPrevMonth),
    revenueBetween(b.startOfYear),
    revenueBetween(new Date(0)),
    countCustomers(),
    countPaying(),
    countRepeat(),
    computeVipThreshold(),
    getSupabase().rpc('segment_counts'),
  ]);

  if (segRows.error) throw segRows.error;
  const segCount = Object.fromEntries((segRows.data || []).map((s) => [s.segment, Number(s.count)]));

  const momDelta =
    prevMonthRevenue.total > 0
      ? round(((monthRevenue.total - prevMonthRevenue.total) / prevMonthRevenue.total) * 100)
      : null;

  res.json({
    success: true,
    data: {
      revenue: {
        month: monthRevenue.total,
        monthOrders: monthRevenue.count,
        quarter: quarterRevenue.total,
        year: yearRevenue.total,
        allTime: allTime.total,
        prevMonth: prevMonthRevenue.total,
        momDeltaPct: momDelta,
        avgOrderValue: allTime.count ? round(allTime.total / allTime.count) : 0,
      },
      customers: {
        total: totalCustomers,
        paying,
        repeat,
        repeatRatePct: paying ? round((repeat / paying) * 100) : 0,
        segments: {
          VIP: segCount[SEGMENTS.VIP] || 0,
          Regular: segCount[SEGMENTS.REGULAR] || 0,
          New: segCount[SEGMENTS.NEW] || 0,
          Inactive: segCount[SEGMENTS.INACTIVE] || 0,
        },
        vipThreshold: Number.isFinite(vipThreshold) ? vipThreshold : null,
      },
    },
  });
});

export const getTopCustomers = asyncHandler(async (req, res) => {
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));
  const items = await topCustomers(limit);
  res.json({ success: true, data: { items } });
});

export const getTopCategories = asyncHandler(async (_req, res) => {
  const { data, error } = await getSupabase().rpc('category_breakdown');
  if (error) throw error;
  const items = (data || []).map((r) => ({
    category: r.category,
    revenue: round(r.revenue),
    units: Number(r.units),
    orders: Number(r.orders),
  }));
  res.json({ success: true, data: { items } });
});

export const getRevenueTrend = asyncHandler(async (req, res) => {
  const months = Math.min(24, Math.max(3, Number(req.query.months) || 12));
  const b = periodBounds(req.query.asOf);
  const start = new Date(b.now.getFullYear(), b.now.getMonth() - (months - 1), 1);

  const { data, error } = await getSupabase().rpc('revenue_trend', { p_start: start.toISOString() });
  if (error) throw error;

  const byKey = new Map((data || []).map((r) => [`${r.yr}-${r.mon}`, r]));
  const series = [];
  const cursor = new Date(start);
  for (let i = 0; i < months; i += 1) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth() + 1;
    const hit = byKey.get(`${y}-${m}`);
    series.push({
      label: cursor.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
      year: y,
      month: m,
      revenue: round(hit?.revenue || 0),
      orders: Number(hit?.orders || 0),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  res.json({ success: true, data: { items: series } });
});

// New vs returning revenue. A purchase is "new" if it is the customer's first
// (identified by stable purchase id, not timestamp equality).
export const getNewVsReturning = asyncHandler(async (req, res) => {
  const months = Math.min(24, Math.max(3, Number(req.query.months) || 6));
  const b = periodBounds(req.query.asOf);
  const start = new Date(b.now.getFullYear(), b.now.getMonth() - (months - 1), 1);

  const supabase = getSupabase();
  const [{ data: firsts, error: fErr }, { data: purchases, error: pErr }] = await Promise.all([
    supabase.rpc('first_purchase_ids'),
    supabase.from('purchases').select('id,customer_id,date,amount').gte('date', start.toISOString()),
  ]);
  if (fErr) throw fErr;
  if (pErr) throw pErr;

  const firstIdByCustomer = new Map((firsts || []).map((f) => [f.customer_id, f.first_purchase_id]));

  const buckets = new Map();
  const cursor = new Date(start);
  for (let i = 0; i < months; i += 1) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth() + 1}`;
    buckets.set(key, {
      label: cursor.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
      newRevenue: 0,
      returningRevenue: 0,
      _newSet: new Set(),
      _retSet: new Set(),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  for (const p of purchases || []) {
    const d = new Date(p.date);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    const bucket = buckets.get(key);
    if (!bucket) continue;
    const isNew = firstIdByCustomer.get(p.customer_id) === p.id;
    if (isNew) {
      bucket.newRevenue += Number(p.amount);
      bucket._newSet.add(p.customer_id);
    } else {
      bucket.returningRevenue += Number(p.amount);
      bucket._retSet.add(p.customer_id);
    }
  }

  const items = [...buckets.values()].map((bk) => ({
    label: bk.label,
    newCustomers: bk._newSet.size,
    returningCustomers: bk._retSet.size,
    newRevenue: round(bk.newRevenue),
    returningRevenue: round(bk.returningRevenue),
  }));

  res.json({ success: true, data: { items } });
});
