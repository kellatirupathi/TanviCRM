import { Router } from 'express';
import { body } from 'express-validator';
import { login, me, changePassword } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').isString().notEmpty().withMessage('Password required'),
  ],
  validate,
  login
);

router.get('/me', protect, me);

router.post(
  '/change-password',
  protect,
  [
    body('currentPassword').isString().notEmpty(),
    body('newPassword')
      .isString()
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ],
  validate,
  changePassword
);

export default router;
