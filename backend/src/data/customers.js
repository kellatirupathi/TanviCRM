import { getSupabase } from '../config/supabase.js';
import { customerToApi } from './mappers.js';
import { SEGMENTS } from '../config/constants.js';
import { finiteNumber, startOfDay, endOfDay } from '../utils/queryParams.js';

const TABLE = 'customers';
const SELECT = '*';

const escapeLike = (s) => s.replace(/[%_,]/g, (m) => `\\${m}`);

/**
 * Apply the customer list filters to a supabase query builder.
 * Supports: q (name/phone/email), segment, spend range, last-purchase range.
 */
function applyFilters(query, params) {
  const { q, segment, minSpend, maxSpend, purchaseFrom, purchaseTo } = params;

  if (q && q.trim()) {
    const term = escapeLike(q.trim());
    query = query.or(`name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`);
  }
  if (segment && Object.values(SEGMENTS).includes(segment)) {
    query = query.eq('segment', segment);
  }
  const min = finiteNumber(minSpend);
  const max = finiteNumber(maxSpend);
  if (min !== undefined) query = query.gte('total_spend', min);
  if (max !== undefined) query = query.lte('total_spend', max);

  const from = startOfDay(purchaseFrom);
  const to = endOfDay(purchaseTo);
  if (from) query = query.gte('last_purchase_at', from.toISOString());
  if (to) query = query.lte('last_purchase_at', to.toISOString());

  return query;
}

const SORT_MAP = {
  name: { col: 'name', asc: true },
  recent: { col: 'last_purchase_at', asc: false },
  spend: { col: 'total_spend', asc: false },
  purchases: { col: 'purchase_count', asc: false },
  created: { col: 'created_at', asc: false },
};

export async function listCustomers(params, { page = 1, limit = 12 } = {}) {
  const sort = SORT_MAP[params.sort] || SORT_MAP.recent;
  let query = getSupabase().from(TABLE).select(SELECT, { count: 'exact' });
  query = applyFilters(query, params);
  query = query.order(sort.col, { ascending: sort.asc, nullsFirst: false });
  // Stable tiebreaker so pagination is deterministic.
  query = query.order('created_at', { ascending: false });
  const fromIdx = (page - 1) * limit;
  query = query.range(fromIdx, fromIdx + limit - 1);

  const { data, count, error } = await query;
  if (error) throw error;
  return { items: (data || []).map(customerToApi), total: count || 0 };
}

// Same filters, no pagination — used by CSV export.
export async function listCustomersForExport(params) {
  const sort = SORT_MAP[params.sort] || SORT_MAP.spend;
  let query = getSupabase().from(TABLE).select(SELECT);
  query = applyFilters(query, params);
  query = query.order(sort.col, { ascending: sort.asc, nullsFirst: false });
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(customerToApi);
}

export async function getCustomerRaw(id) {
  const { data, error } = await getSupabase().from(TABLE).select(SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function getCustomer(id) {
  return customerToApi(await getCustomerRaw(id));
}

export async function createCustomer(fields, createdBy) {
  const row = {
    name: fields.name,
    phone: fields.phone,
    email: fields.email || '',
    address: fields.address || { line: '', city: 'Hyderabad', pincode: '' },
    style_preferences: fields.stylePreferences || [],
    notes: fields.notes || '',
    avatar_color: fields.avatarColor || '#6B2C4F',
    created_by: createdBy || null,
  };
  const { data, error } = await getSupabase().from(TABLE).insert(row).select(SELECT).single();
  if (error) throw error;
  return customerToApi(data);
}

export async function updateCustomer(id, fields) {
  const update = { updated_at: new Date().toISOString() };
  if (fields.name !== undefined) update.name = fields.name;
  if (fields.phone !== undefined) update.phone = fields.phone;
  if (fields.email !== undefined) update.email = fields.email;
  if (fields.notes !== undefined) update.notes = fields.notes;
  if (fields.stylePreferences !== undefined) update.style_preferences = fields.stylePreferences;
  if (fields.address !== undefined) update.address = fields.address;

  const { data, error } = await getSupabase().from(TABLE).update(update).eq('id', id).select(SELECT).single();
  if (error) throw error;
  return customerToApi(data);
}

export async function deleteCustomer(id) {
  // purchases cascade via FK ON DELETE CASCADE.
  const { error } = await getSupabase().from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

// Persist recomputed aggregates + segment for one customer.
export async function setAggregates(id, { totalSpend, purchaseCount, firstPurchaseAt, lastPurchaseAt, segment }) {
  const update = {
    total_spend: totalSpend,
    purchase_count: purchaseCount,
    first_purchase_at: firstPurchaseAt ? new Date(firstPurchaseAt).toISOString() : null,
    last_purchase_at: lastPurchaseAt ? new Date(lastPurchaseAt).toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  if (segment !== undefined) update.segment = segment;
  const { error } = await getSupabase().from(TABLE).update(update).eq('id', id);
  if (error) throw error;
}

export async function setSegment(id, segment) {
  const { error } = await getSupabase().from(TABLE).update({ segment }).eq('id', id);
  if (error) throw error;
}

// Lightweight rows for cohort re-segmentation / VIP threshold.
export async function allCustomersForSegmenting() {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('id,segment,total_spend,purchase_count');
  if (error) throw error;
  return data || [];
}

export async function payingCustomersBySpend() {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('id,total_spend')
    .gt('purchase_count', 0)
    .order('total_spend', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function countCustomers() {
  const { count, error } = await getSupabase().from(TABLE).select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count || 0;
}

export async function countPaying() {
  const { count, error } = await getSupabase()
    .from(TABLE).select('id', { count: 'exact', head: true }).gt('purchase_count', 0);
  if (error) throw error;
  return count || 0;
}

export async function countRepeat() {
  const { count, error } = await getSupabase()
    .from(TABLE).select('id', { count: 'exact', head: true }).gte('purchase_count', 2);
  if (error) throw error;
  return count || 0;
}

export async function topCustomers(limit = 8) {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('id,name,phone,avatar_color,segment,total_spend,purchase_count,last_purchase_at')
    .gt('purchase_count', 0)
    .order('total_spend', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(customerToApi);
}

export { customerToApi };
