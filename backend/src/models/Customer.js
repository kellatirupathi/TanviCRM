import mongoose from 'mongoose';
import { SEGMENTS, STYLE_PREFERENCES } from '../config/constants.js';

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      trim: true,
      // Indian mobile (optionally +91), 10 digits starting 6-9.
      match: [/^(\+91[-\s]?)?[6-9]\d{9}$/, 'Invalid phone number'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      match: [/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    address: {
      line: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: 'Hyderabad' },
      pincode: { type: String, trim: true, default: '' },
    },
    stylePreferences: {
      type: [String],
      enum: STYLE_PREFERENCES,
      default: [],
    },
    notes: { type: String, trim: true, default: '' },
    avatarColor: { type: String, default: '#6B2C4F' },

    // ── Denormalised aggregates, kept in sync by the Purchase model hooks
    // and recomputed on demand. Source of truth is always the Purchase
    // collection; these exist for fast list/sort/filter and segmentation.
    totalSpend: { type: Number, default: 0, min: 0 },
    purchaseCount: { type: Number, default: 0, min: 0 },
    firstPurchaseAt: { type: Date, default: null },
    lastPurchaseAt: { type: Date, default: null },

    // Base segment from rules below; VIP is layered on at query time
    // because it depends on the whole cohort (top 10%).
    segment: {
      type: String,
      enum: Object.values(SEGMENTS),
      default: SEGMENTS.INACTIVE,
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Text-ish search support (name / phone / email).
customerSchema.index({ name: 'text', email: 'text' });
customerSchema.index({ phone: 1 });
customerSchema.index({ totalSpend: -1 });

/**
 * Recompute aggregates + base segment from the Purchase collection.
 * `vipThreshold` (optional) upgrades qualifying customers to VIP.
 */
customerSchema.methods.recomputeFrom = function recomputeFrom(purchases, vipThreshold = Infinity) {
  const count = purchases.length;
  const total = purchases.reduce((s, p) => s + p.amount, 0);
  const dates = purchases.map((p) => new Date(p.date)).sort((a, b) => a - b);

  this.purchaseCount = count;
  this.totalSpend = Math.round(total * 100) / 100;
  this.firstPurchaseAt = dates[0] || null;
  this.lastPurchaseAt = dates[dates.length - 1] || null;
  this.segment = deriveSegment({ count, total }, vipThreshold);
  return this;
};

export function deriveSegment({ count, total }, vipThreshold = Infinity) {
  if (count === 0) return SEGMENTS.INACTIVE;
  if (total >= vipThreshold) return SEGMENTS.VIP;
  if (count >= 2) return SEGMENTS.REGULAR;
  return SEGMENTS.NEW;
}

export default mongoose.model('Customer', customerSchema);
