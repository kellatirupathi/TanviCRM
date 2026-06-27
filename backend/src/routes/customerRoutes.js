import { Router } from 'express';
import { body } from 'express-validator';
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  exportCustomersCsv,
} from '../controllers/customerController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ROLES, STYLE_PREFERENCES } from '../config/constants.js';

const router = Router();
router.use(protect);

const customerValidators = [
  body('name').isString().trim().notEmpty().withMessage('Name is required'),
  body('phone')
    .matches(/^(\+91[-\s]?)?[6-9]\d{9}$/)
    .withMessage('Valid Indian phone number required'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email'),
  body('stylePreferences')
    .optional()
    .isArray()
    .custom((arr) => arr.every((s) => STYLE_PREFERENCES.includes(s)))
    .withMessage('Invalid style preference'),
];

router.get('/', listCustomers);
router.get('/export', exportCustomersCsv);
router.get('/:id', getCustomer);
router.post('/', customerValidators, validate, createCustomer);
router.put('/:id', customerValidators, validate, updateCustomer);
// Only admins may delete a customer (and cascade their purchases).
router.delete('/:id', authorize(ROLES.ADMIN), deleteCustomer);

export default router;
