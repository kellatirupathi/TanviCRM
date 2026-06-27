// ── Shared domain constants ──────────────────────────────────

export const ROLES = Object.freeze({
  ADMIN: 'admin',
  STAFF: 'staff',
});

export const SEGMENTS = Object.freeze({
  VIP: 'VIP',
  REGULAR: 'Regular',
  NEW: 'New',
  INACTIVE: 'Inactive', // customer with 0 purchases (added but never bought)
});

export const PAYMENT_METHODS = Object.freeze([
  'Cash',
  'UPI',
  'Card',
  'Net Banking',
  'Store Credit',
]);

// Product categories used in the boutique (collected from client context).
export const PRODUCT_CATEGORIES = Object.freeze([
  'Sarees',
  'Lehengas',
  'Kurtis',
  'Anarkali Suits',
  'Gowns',
  'Blouses',
  'Dupattas & Stoles',
  'Bridal Wear',
  'Accessories',
  'Fabric & Unstitched',
]);

export const STYLE_PREFERENCES = Object.freeze([
  'Traditional',
  'Contemporary',
  'Indo-Western',
  'Bridal',
  'Festive',
  'Casual',
  'Handloom',
  'Designer',
]);

// VIP = top 10% of paying customers by total spend.
export const VIP_TOP_PERCENTILE = 0.1;
