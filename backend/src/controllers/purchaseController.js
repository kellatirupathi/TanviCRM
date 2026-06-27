import mongoose from 'mongoose';
import Purchase from '../models/Purchase.js';
import Customer from '../models/Customer.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { recomputeCustomer } from '../utils/segmentation.js';
import { finiteNumber, startOfDay, endOfDay, range } from '../utils/queryParams.js';

function buildPurchaseQuery(query) {
  const filter = {};
  const { customer, category, paymentMethod, from, to, minAmount, maxAmount } = query;
  // Ignore a malformed customer id rather than letting it throw a CastError.
  if (customer && mongoose.isValidObjectId(customer)) filter.customer = customer;
  if (category) filter['items.category'] = category;
  if (paymentMethod) filter.paymentMethod = paymentMethod;

  const dateRange = range(startOfDay(from), endOfDay(to));
  if (dateRange) filter.date = dateRange;

  const amountRange = range(finiteNumber(minAmount), finiteNumber(maxAmount));
  if (amountRange) filter.amount = amountRange;

  return filter;
}

export const listPurchases = asyncHandler(async (req, res) => {
  const filter = buildPurchaseQuery(req.query);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 15));

  const [items, total] = await Promise.all([
    Purchase.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('customer', 'name phone avatarColor segment')
      .lean(),
    Purchase.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    },
  });
});

export const createPurchase = asyncHandler(async (req, res) => {
  const { customer: customerId } = req.body;
  const customer = await Customer.findById(customerId);
  if (!customer) throw ApiError.badRequest('Customer does not exist');

  const purchase = await Purchase.create({
    customer: customerId,
    date: req.body.date || new Date(),
    items: req.body.items,
    paymentMethod: req.body.paymentMethod,
    invoiceNo: req.body.invoiceNo,
    notes: req.body.notes || '',
    createdBy: req.user._id,
  });

  await recomputeCustomer(customerId);
  const populated = await purchase.populate('customer', 'name phone avatarColor segment');
  res.status(201).json({ success: true, data: { purchase: populated } });
});

export const updatePurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findById(req.params.id);
  if (!purchase) throw ApiError.notFound('Purchase not found');

  const previousCustomer = String(purchase.customer);
  for (const k of ['date', 'items', 'paymentMethod', 'invoiceNo', 'notes']) {
    if (req.body[k] !== undefined) purchase[k] = req.body[k];
  }
  if (req.body.customer && req.body.customer !== previousCustomer) {
    const exists = await Customer.exists({ _id: req.body.customer });
    if (!exists) throw ApiError.badRequest('Customer does not exist');
    purchase.customer = req.body.customer;
  }
  await purchase.save();

  // Recompute both old and (if changed) new customer aggregates.
  await recomputeCustomer(previousCustomer);
  if (String(purchase.customer) !== previousCustomer) {
    await recomputeCustomer(String(purchase.customer));
  }

  const populated = await purchase.populate('customer', 'name phone avatarColor segment');
  res.json({ success: true, data: { purchase: populated } });
});

export const deletePurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findById(req.params.id);
  if (!purchase) throw ApiError.notFound('Purchase not found');
  const customerId = String(purchase.customer);
  await purchase.deleteOne();
  await recomputeCustomer(customerId);
  res.json({ success: true, data: { message: 'Purchase removed' } });
});
