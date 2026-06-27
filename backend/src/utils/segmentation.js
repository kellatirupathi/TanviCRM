import {
  payingCustomersBySpend,
  allCustomersForSegmenting,
  getCustomerRaw,
  setAggregates,
  setSegment,
} from '../data/customers.js';
import { purchaseAggRows } from '../data/purchases.js';
import { deriveSegment, aggregatePurchases } from '../data/segment.js';
import { VIP_TOP_PERCENTILE } from '../config/constants.js';
import { getSupabase } from '../config/supabase.js';

/**
 * Spend threshold above which a customer is VIP — top 10% of *paying* customers
 * by total spend. Returns Infinity when there are no paying customers.
 */
export async function computeVipThreshold() {
  const payers = await payingCustomersBySpend();
  if (payers.length === 0) return Infinity;
  const cutoffCount = Math.max(1, Math.ceil(payers.length * VIP_TOP_PERCENTILE));
  return Number(payers[cutoffCount - 1].total_spend);
}

/**
 * Recompute one customer's aggregates from their purchases, then re-derive
 * segments for the WHOLE cohort against the fresh VIP threshold (VIP is
 * cohort-relative, so one change can shift others). Writes only changed rows.
 */
export async function recomputeCustomer(customerId) {
  const customer = await getCustomerRaw(customerId);
  if (!customer) return null;

  const rows = await purchaseAggRows(customerId);
  const agg = aggregatePurchases(rows);
  await setAggregates(customerId, { ...agg, segment: undefined });

  await resegmentCohort();
  return getCustomerRaw(customerId);
}

/**
 * Re-derive every customer's segment from stored aggregates against the current
 * VIP threshold. Persists only the customers whose segment actually changed.
 */
export async function resegmentCohort() {
  const threshold = await computeVipThreshold();
  const customers = await allCustomersForSegmenting();

  const changed = [];
  for (const c of customers) {
    const next = deriveSegment(
      { count: c.purchase_count, total: Number(c.total_spend) },
      threshold
    );
    if (next !== c.segment) changed.push({ id: c.id, segment: next });
  }

  // Group by target segment so we can update in a few bulk statements.
  if (changed.length) {
    const bySegment = new Map();
    for (const { id, segment } of changed) {
      if (!bySegment.has(segment)) bySegment.set(segment, []);
      bySegment.get(segment).push(id);
    }
    for (const [segment, ids] of bySegment) {
      const { error } = await getSupabase()
        .from('customers')
        .update({ segment })
        .in('id', ids);
      if (error) throw error;
    }
  }
  return { threshold, updated: changed.length };
}

export { deriveSegment, setSegment };
