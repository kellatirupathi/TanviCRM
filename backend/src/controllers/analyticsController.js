import Purchase from '../models/Purchase.js';
import Customer from '../models/Customer.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { SEGMENTS } from '../config/constants.js';
import { computeVipThreshold } from '../utils/segmentation.js';

// Boundaries are computed from "now" unless an `asOf` query param is given
// (used by tests/seed verification to pin a reference date).
function periodBounds(asOf) {
  const now = asOf ? new Date(asOf) : new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const quarter = Math.floor(now.getMonth() / 3);
  const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  // Previous month for delta.
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPrevMonth = new Date(startOfMonth.getTime() - 1);
  return { now, startOfMonth, startOfQuarter, startOfYear, startOfPrevMonth, endOfPrevMonth };
}

const sumBetween = async (start, end) => {
  const match = { date: { $gte: start } };
  if (end) match.date.$lte = end;
  const [row] = await Purchase.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  return { total: round(row?.total || 0), count: row?.count || 0 };
};

const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export const getSummary = asyncHandler(async (req, res) => {
  const b = periodBounds(req.query.asOf);

  const [
    monthRevenue,
    quarterRevenue,
    prevMonthRevenue,
    yearRevenue,
    allTime,
    totalCustomers,
    segmentCounts,
    vipThreshold,
  ] = await Promise.all([
    sumBetween(b.startOfMonth),
    sumBetween(b.startOfQuarter),
    sumBetween(b.startOfPrevMonth, b.endOfPrevMonth),
    sumBetween(b.startOfYear),
    sumBetween(new Date(0)),
    Customer.countDocuments(),
    Customer.aggregate([{ $group: { _id: '$segment', count: { $sum: 1 } } }]),
    computeVipThreshold(),
  ]);

  const segCount = Object.fromEntries(segmentCounts.map((s) => [s._id, s.count]));
  const payingCustomers = await Customer.countDocuments({ purchaseCount: { $gt: 0 } });
  const repeatCustomers = await Customer.countDocuments({ purchaseCount: { $gte: 2 } });

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
        paying: payingCustomers,
        repeat: repeatCustomers,
        repeatRatePct: payingCustomers ? round((repeatCustomers / payingCustomers) * 100) : 0,
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

// Top customers by total spend.
export const getTopCustomers = asyncHandler(async (req, res) => {
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));
  const items = await Customer.find({ purchaseCount: { $gt: 0 } })
    .sort({ totalSpend: -1 })
    .limit(limit)
    .select('name phone avatarColor segment totalSpend purchaseCount lastPurchaseAt')
    .lean();
  res.json({ success: true, data: { items } });
});

// Most popular product categories by revenue and units.
export const getTopCategories = asyncHandler(async (req, res) => {
  const items = await Purchase.aggregate([
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.category',
        revenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
        units: { $sum: '$items.quantity' },
        orders: { $sum: 1 },
      },
    },
    { $project: { _id: 0, category: '$_id', revenue: { $round: ['$revenue', 2] }, units: 1, orders: 1 } },
    { $sort: { revenue: -1 } },
  ]);
  res.json({ success: true, data: { items } });
});

// Monthly revenue trend for the last N months (default 12).
export const getRevenueTrend = asyncHandler(async (req, res) => {
  const months = Math.min(24, Math.max(3, Number(req.query.months) || 12));
  const b = periodBounds(req.query.asOf);
  const start = new Date(b.now.getFullYear(), b.now.getMonth() - (months - 1), 1);

  const rows = await Purchase.aggregate([
    { $match: { date: { $gte: start } } },
    {
      $group: {
        _id: { y: { $year: '$date' }, m: { $month: '$date' } },
        revenue: { $sum: '$amount' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { '_id.y': 1, '_id.m': 1 } },
  ]);

  // Fill gaps so the chart has a continuous axis.
  const byKey = new Map(rows.map((r) => [`${r._id.y}-${r._id.m}`, r]));
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
      orders: hit?.orders || 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  res.json({ success: true, data: { items: series } });
});

// New vs returning customer breakdown over the last N months.
// A purchase is "new-customer revenue" if it is that customer's first purchase.
export const getNewVsReturning = asyncHandler(async (req, res) => {
  const months = Math.min(24, Math.max(3, Number(req.query.months) || 6));
  const b = periodBounds(req.query.asOf);
  const start = new Date(b.now.getFullYear(), b.now.getMonth() - (months - 1), 1);

  // For each customer, find the _id of their first purchase. We sort by
  // (date, _id) and take the earliest so the "first" purchase is identified by
  // a stable id — not by fragile millisecond-exact timestamp equality, which
  // would misclassify same-timestamp ties and break on any date precision diff.
  const firsts = await Purchase.aggregate([
    { $sort: { date: 1, _id: 1 } },
    { $group: { _id: '$customer', firstPurchaseId: { $first: '$_id' } } },
  ]);
  const firstIdByCustomer = new Map(firsts.map((f) => [String(f._id), String(f.firstPurchaseId)]));

  const purchases = await Purchase.find({ date: { $gte: start } })
    .select('customer date amount _id')
    .lean();

  const buckets = new Map(); // key -> { newCustomers:Set, returning:Set, newRev, retRev }
  const cursor = new Date(start);
  for (let i = 0; i < months; i += 1) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth() + 1}`;
    buckets.set(key, {
      label: cursor.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
      newCount: 0,
      returningCount: 0,
      newRevenue: 0,
      returningRevenue: 0,
      _newSet: new Set(),
      _retSet: new Set(),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  for (const p of purchases) {
    const d = new Date(p.date);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    const bucket = buckets.get(key);
    if (!bucket) continue;
    const isNew = firstIdByCustomer.get(String(p.customer)) === String(p._id);
    if (isNew) {
      bucket.newRevenue += p.amount;
      bucket._newSet.add(String(p.customer));
    } else {
      bucket.returningRevenue += p.amount;
      bucket._retSet.add(String(p.customer));
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
