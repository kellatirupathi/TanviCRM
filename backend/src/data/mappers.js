// Map Postgres snake_case rows to the camelCase shapes the API/ frontend expect
// (and back). Keeping this in one place means the rest of the app speaks the
// exact same field names it did under Mongoose, so the frontend is unchanged.

export function userToApi(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatarColor: row.avatar_color,
    active: row.active,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  };
}

export function customerToApi(row) {
  if (!row) return null;
  return {
    _id: row.id, // frontend keys customers by _id (Mongo carryover)
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email || '',
    address: row.address || { line: '', city: 'Hyderabad', pincode: '' },
    stylePreferences: row.style_preferences || [],
    notes: row.notes || '',
    avatarColor: row.avatar_color,
    totalSpend: Number(row.total_spend) || 0,
    purchaseCount: row.purchase_count || 0,
    firstPurchaseAt: row.first_purchase_at,
    lastPurchaseAt: row.last_purchase_at,
    segment: row.segment,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function purchaseToApi(row, customer = undefined) {
  if (!row) return null;
  const items = (row.items || []).map((it) => ({
    name: it.name,
    category: it.category,
    quantity: Number(it.quantity),
    unitPrice: Number(it.unitPrice),
  }));
  const out = {
    _id: row.id,
    id: row.id,
    customer:
      customer !== undefined
        ? customer
        : row.customer_id, // populated object or raw id
    date: row.date,
    items,
    amount: Number(row.amount) || 0,
    paymentMethod: row.payment_method,
    invoiceNo: row.invoice_no,
    notes: row.notes || '',
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
  return out;
}

// Compact customer shape used when populating a purchase's customer field.
export function customerMini(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    phone: row.phone,
    avatarColor: row.avatar_color,
    segment: row.segment,
  };
}
