import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { recomputeCustomer } from '../utils/segmentation.js';
import * as Purchases from '../data/purchases.js';
import { getCustomerRaw } from '../data/customers.js';

export const listPurchases = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 15));
  const { items, total } = await Purchases.listPurchases(req.query, { page, limit });
  res.json({
    success: true,
    data: {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    },
  });
});

export const createPurchase = asyncHandler(async (req, res) => {
  const customer = await getCustomerRaw(req.body.customer);
  if (!customer) throw ApiError.badRequest('Customer does not exist');

  const purchase = await Purchases.createPurchase(
    {
      customer: req.body.customer,
      date: req.body.date,
      items: req.body.items,
      paymentMethod: req.body.paymentMethod,
      invoiceNo: req.body.invoiceNo,
      notes: req.body.notes || '',
    },
    req.user.id
  );

  await recomputeCustomer(req.body.customer);
  res.status(201).json({ success: true, data: { purchase } });
});

export const updatePurchase = asyncHandler(async (req, res) => {
  const existing = await Purchases.getPurchaseRaw(req.params.id);
  if (!existing) throw ApiError.notFound('Purchase not found');

  const previousCustomer = existing.customer_id;
  const patch = {};
  for (const k of ['date', 'items', 'paymentMethod', 'invoiceNo', 'notes']) {
    if (req.body[k] !== undefined) patch[k] = req.body[k];
  }
  if (req.body.customer && req.body.customer !== previousCustomer) {
    const exists = await getCustomerRaw(req.body.customer);
    if (!exists) throw ApiError.badRequest('Customer does not exist');
    patch.customer = req.body.customer;
  }

  const purchase = await Purchases.updatePurchase(req.params.id, patch);

  // Recompute both old and (if changed) new customer aggregates.
  await recomputeCustomer(previousCustomer);
  if (patch.customer && patch.customer !== previousCustomer) {
    await recomputeCustomer(patch.customer);
  }

  res.json({ success: true, data: { purchase } });
});

export const deletePurchase = asyncHandler(async (req, res) => {
  const existing = await Purchases.getPurchaseRaw(req.params.id);
  if (!existing) throw ApiError.notFound('Purchase not found');
  const customerId = existing.customer_id;
  await Purchases.deletePurchase(req.params.id);
  await recomputeCustomer(customerId);
  res.json({ success: true, data: { message: 'Purchase removed' } });
});
