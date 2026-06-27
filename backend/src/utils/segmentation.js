import Customer, { deriveSegment } from '../models/Customer.js';
import Purchase from '../models/Purchase.js';
import { VIP_TOP_PERCENTILE } from '../config/constants.js';

/**
 * Compute the spend threshold above which a customer is VIP.
 * VIP = top 10% of *paying* customers by total spend.
 * Returns Infinity when there aren't enough paying customers to form a tier.
 */
export async function computeVipThreshold() {
  const payers = await Customer.find({ purchaseCount: { $gt: 0 } })
    .select('totalSpend')
    .sort({ totalSpend: -1 })
    .lean();

  if (payers.length === 0) return Infinity;

  // Number of customers in the top 10% (at least 1 if any payers exist).
  const cutoffCount = Math.max(1, Math.ceil(payers.length * VIP_TOP_PERCENTILE));
  // Threshold is the spend of the lowest-ranked VIP — anyone at/above is VIP.
  return payers[cutoffCount - 1].totalSpend;
}

/**
 * Recalculate aggregates for a single customer from their purchases.
 *
 * VIP membership is *cohort-relative* (top 10% by spend), so a change to one
 * customer's spend can shift the threshold and silently invalidate OTHER
 * customers' stored segment. We therefore recompute the one customer's
 * aggregates, then re-derive segments for the whole cohort against the fresh
 * threshold, persisting only the customers whose segment actually changed.
 *
 * The dataset is a single boutique (dozens–low thousands of customers), so a
 * cohort re-segment per purchase write is cheap and is the only correct way to
 * keep a cohort-relative tag consistent.
 */
export async function recomputeCustomer(customerId) {
  const customer = await Customer.findById(customerId);
  if (!customer) return null;

  const purchases = await Purchase.find({ customer: customerId })
    .select('amount date')
    .lean();

  // Update this customer's aggregates first so the threshold calc sees them.
  customer.recomputeFrom(purchases);
  await customer.save();

  // Re-derive segments for the entire cohort against the new threshold.
  await resegmentCohort();

  // Return the up-to-date document for the caller.
  return Customer.findById(customerId);
}

/**
 * Re-derive every customer's segment from their stored aggregates against the
 * current VIP threshold. Writes only the documents whose segment changed.
 */
export async function resegmentCohort() {
  const threshold = await computeVipThreshold();
  const customers = await Customer.find()
    .select('segment purchaseCount totalSpend')
    .lean();

  const ops = [];
  for (const c of customers) {
    const next = deriveSegment(
      { count: c.purchaseCount, total: c.totalSpend },
      threshold
    );
    if (next !== c.segment) {
      ops.push({
        updateOne: { filter: { _id: c._id }, update: { $set: { segment: next } } },
      });
    }
  }
  if (ops.length) await Customer.bulkWrite(ops);
  return { threshold, updated: ops.length };
}

/**
 * Recompute every customer (used by the seed script and a maintenance route).
 * Two passes: aggregates first, then segments once the VIP threshold is known.
 */
export async function recomputeAll() {
  const customers = await Customer.find();
  const purchasesByCustomer = new Map();
  const all = await Purchase.find().select('amount date customer').lean();
  for (const p of all) {
    const key = String(p.customer);
    if (!purchasesByCustomer.has(key)) purchasesByCustomer.set(key, []);
    purchasesByCustomer.get(key).push(p);
  }

  for (const c of customers) {
    c.recomputeFrom(purchasesByCustomer.get(String(c._id)) || []);
  }
  await Promise.all(customers.map((c) => c.save()));

  const threshold = await computeVipThreshold();
  for (const c of customers) {
    c.segment = deriveSegment(
      { count: c.purchaseCount, total: c.totalSpend },
      threshold
    );
  }
  await Promise.all(customers.map((c) => c.save()));
  return { count: customers.length, vipThreshold: threshold };
}
