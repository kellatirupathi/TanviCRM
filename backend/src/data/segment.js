import { SEGMENTS } from '../config/constants.js';

// Pure segment derivation — identical rules to the former Mongoose model.
// VIP is layered on by the caller using a cohort-wide threshold.
export function deriveSegment({ count, total }, vipThreshold = Infinity) {
  if (count === 0) return SEGMENTS.INACTIVE;
  if (total >= vipThreshold) return SEGMENTS.VIP;
  if (count >= 2) return SEGMENTS.REGULAR;
  return SEGMENTS.NEW;
}

// Aggregate a customer's purchases into { totalSpend, purchaseCount, first, last }.
export function aggregatePurchases(purchases) {
  const count = purchases.length;
  const total = purchases.reduce((s, p) => s + Number(p.amount), 0);
  const dates = purchases
    .map((p) => new Date(p.date))
    .sort((a, b) => a - b);
  return {
    purchaseCount: count,
    totalSpend: Math.round(total * 100) / 100,
    firstPurchaseAt: dates[0] || null,
    lastPurchaseAt: dates[dates.length - 1] || null,
  };
}
