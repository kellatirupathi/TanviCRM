import mongoose from 'mongoose';
import { PAYMENT_METHODS, PRODUCT_CATEGORIES } from '../config/constants.js';

const lineItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: PRODUCT_CATEGORIES, required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

lineItemSchema.virtual('lineTotal').get(function lineTotal() {
  return Math.round(this.quantity * this.unitPrice * 100) / 100;
});

const purchaseSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    date: { type: Date, required: true, default: Date.now, index: true },
    items: {
      type: [lineItemSchema],
      required: true,
      validate: [(v) => v.length > 0, 'At least one item is required'],
    },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      required: true,
      default: 'UPI',
    },
    invoiceNo: { type: String, trim: true },
    notes: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

purchaseSchema.index({ customer: 1, date: -1 });

// Keep amount consistent with line items if not explicitly provided.
purchaseSchema.pre('validate', function syncAmount(next) {
  if (Array.isArray(this.items) && this.items.length) {
    const computed = this.items.reduce(
      (s, it) => s + it.quantity * it.unitPrice,
      0
    );
    // Trust line items as the source of truth for the total.
    this.amount = Math.round(computed * 100) / 100;
  }
  next();
});

export default mongoose.model('Purchase', purchaseSchema);
