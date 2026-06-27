import { Router } from 'express';
import { body } from 'express-validator';
import {
  listPurchases,
  createPurchase,
  updatePurchase,
  deletePurchase,
} from '../controllers/purchaseController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ROLES, PRODUCT_CATEGORIES, PAYMENT_METHODS } from '../config/constants.js';

const router = Router();
router.use(protect);

const purchaseValidators = [
  body('customer').isUUID().withMessage('Valid customer required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.name').isString().trim().notEmpty().withMessage('Item name required'),
  body('items.*.category')
    .isIn(PRODUCT_CATEGORIES)
    .withMessage('Invalid product category'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be ≥ 1'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be ≥ 0'),
  body('paymentMethod').isIn(PAYMENT_METHODS).withMessage('Invalid payment method'),
  body('date').optional().isISO8601().withMessage('Invalid date'),
];

// Update allows customer to be optional (only when reassigning).
const updateValidators = [
  body('customer').optional().isUUID(),
  body('items').optional().isArray({ min: 1 }),
  body('items.*.name').optional().isString().trim().notEmpty(),
  body('items.*.category').optional().isIn(PRODUCT_CATEGORIES),
  body('items.*.quantity').optional().isInt({ min: 1 }),
  body('items.*.unitPrice').optional().isFloat({ min: 0 }),
  body('paymentMethod').optional().isIn(PAYMENT_METHODS),
  body('date').optional().isISO8601(),
];

router.get('/', listPurchases);
router.post('/', purchaseValidators, validate, createPurchase);
router.put('/:id', updateValidators, validate, updatePurchase);
router.delete('/:id', authorize(ROLES.ADMIN, ROLES.STAFF), deletePurchase);

export default router;
