import { getSupabase } from '../config/supabase.js';
import { purchaseToApi, customerMini } from './mappers.js';
import { finiteNumber, startOfDay, endOfDay } from '../utils/queryParams.js';

const TABLE = 'purchases';

// Trust line items as the source of truth for the total (mirrors the old
// Mongoose pre-validate hook).
export function computeAmount(items) {
  const total = (items || []).reduce(
    (s, it) => s + Number(it.quantity) * Number(it.unitPrice),
    0
  );
  return Math.round(total * 100) / 100;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function applyFilters(query, params) {
  const { customer, category, paymentMethod, from, to, minAmount, maxAmount } = params;
  // Ignore a malformed customer id rather than letting Postgres throw.
  if (customer && UUID_RE.test(customer)) query = query.eq('customer_id', customer);
  if (category) query = query.contains('items', [{ category }]);
  if (paymentMethod) query = query.eq('payment_method', paymentMethod);

  const f = startOfDay(from);
  const t = endOfDay(to);
  if (f) query = query.gte('date', f.toISOString());
  if (t) query = query.lte('date', t.toISOString());

  const min = finiteNumber(minAmount);
  const max = finiteNumber(maxAmount);
  if (min !== undefined) query = query.gte('amount', min);
  if (max !== undefined) query = query.lte('amount', max);
  return query;
}

// List purchases with the customer "populated" (joined) like Mongo's populate.
export async function listPurchases(params, { page = 1, limit = 15 } = {}) {
  let query = getSupabase()
    .from(TABLE)
    .select('*, customer:customers(id,name,phone,avatar_color,segment)', { count: 'exact' });
  query = applyFilters(query, params);
  query = query.order('date', { ascending: false });
  const fromIdx = (page - 1) * limit;
  query = query.range(fromIdx, fromIdx + limit - 1);

  const { data, count, error } = await query;
  if (error) throw error;
  const items = (data || []).map((row) => purchaseToApi(row, customerMini(row.customer)));
  return { items, total: count || 0 };
}

// All purchases for one customer (newest first) — for the profile page.
export async function purchasesForCustomer(customerId) {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('*')
    .eq('customer_id', customerId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => purchaseToApi(row, row.customer_id));
}

// Minimal rows (amount/date) for recomputing a customer's aggregates.
export async function purchaseAggRows(customerId) {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('amount,date')
    .eq('customer_id', customerId);
  if (error) throw error;
  return data || [];
}

export async function getPurchaseRaw(id) {
  const { data, error } = await getSupabase().from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function createPurchase(fields, createdBy) {
  const amount = computeAmount(fields.items);
  const row = {
    customer_id: fields.customer,
    date: fields.date ? new Date(fields.date).toISOString() : new Date().toISOString(),
    items: fields.items,
    amount,
    payment_method: fields.paymentMethod,
    invoice_no: fields.invoiceNo || null,
    notes: fields.notes || '',
    created_by: createdBy || null,
  };
  const { data, error } = await getSupabase()
    .from(TABLE)
    .insert(row)
    .select('*, customer:customers(id,name,phone,avatar_color,segment)')
    .single();
  if (error) throw error;
  return purchaseToApi(data, customerMini(data.customer));
}

export async function updatePurchase(id, fields) {
  const update = { updated_at: new Date().toISOString() };
  if (fields.items !== undefined) {
    update.items = fields.items;
    update.amount = computeAmount(fields.items);
  }
  if (fields.date !== undefined) update.date = new Date(fields.date).toISOString();
  if (fields.paymentMethod !== undefined) update.payment_method = fields.paymentMethod;
  if (fields.invoiceNo !== undefined) update.invoice_no = fields.invoiceNo;
  if (fields.notes !== undefined) update.notes = fields.notes;
  if (fields.customer !== undefined) update.customer_id = fields.customer;

  const { data, error } = await getSupabase()
    .from(TABLE)
    .update(update)
    .eq('id', id)
    .select('*, customer:customers(id,name,phone,avatar_color,segment)')
    .single();
  if (error) throw error;
  return purchaseToApi(data, customerMini(data.customer));
}

export async function deletePurchase(id) {
  const { error } = await getSupabase().from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export { purchaseToApi };
