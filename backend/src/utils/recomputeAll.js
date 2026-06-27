import { getSupabase } from '../config/supabase.js';
import { aggregatePurchases, deriveSegment } from '../data/segment.js';
import { VIP_TOP_PERCENTILE } from '../config/constants.js';

/**
 * Recompute aggregates + segments for EVERY customer from the purchases table.
 * Used by the seed script and the data-migration script. Two passes: write
 * aggregates first, then segment once the VIP threshold is known.
 */
export async function recomputeAll() {
  const supabase = getSupabase();

  const [{ data: customers, error: cErr }, { data: purchases, error: pErr }] = await Promise.all([
    supabase.from('customers').select('id'),
    supabase.from('purchases').select('customer_id,amount,date'),
  ]);
  if (cErr) throw cErr;
  if (pErr) throw pErr;

  // Group purchases by customer.
  const byCustomer = new Map();
  for (const p of purchases || []) {
    if (!byCustomer.has(p.customer_id)) byCustomer.set(p.customer_id, []);
    byCustomer.get(p.customer_id).push(p);
  }

  // Pass 1 — aggregates.
  const aggById = new Map();
  for (const c of customers || []) {
    const agg = aggregatePurchases(byCustomer.get(c.id) || []);
    aggById.set(c.id, agg);
    const { error } = await supabase
      .from('customers')
      .update({
        total_spend: agg.totalSpend,
        purchase_count: agg.purchaseCount,
        first_purchase_at: agg.firstPurchaseAt ? new Date(agg.firstPurchaseAt).toISOString() : null,
        last_purchase_at: agg.lastPurchaseAt ? new Date(agg.lastPurchaseAt).toISOString() : null,
      })
      .eq('id', c.id);
    if (error) throw error;
  }

  // VIP threshold from the freshly-updated spends.
  const spends = [...aggById.values()]
    .filter((a) => a.purchaseCount > 0)
    .map((a) => a.totalSpend)
    .sort((a, b) => b - a);
  const threshold =
    spends.length === 0
      ? Infinity
      : spends[Math.max(1, Math.ceil(spends.length * VIP_TOP_PERCENTILE)) - 1];

  // Pass 2 — segments (batched by target segment).
  const bySegment = new Map();
  for (const c of customers || []) {
    const agg = aggById.get(c.id);
    const segment = deriveSegment({ count: agg.purchaseCount, total: agg.totalSpend }, threshold);
    if (!bySegment.has(segment)) bySegment.set(segment, []);
    bySegment.get(segment).push(c.id);
  }
  for (const [segment, ids] of bySegment) {
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      const { error } = await supabase.from('customers').update({ segment }).in('id', chunk);
      if (error) throw error;
    }
  }

  return { count: (customers || []).length, vipThreshold: threshold };
}
