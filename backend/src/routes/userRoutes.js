import { Router } from 'express';
import { body } from 'express-validator';
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../config/constants.js';

const router = Router();
// User management is admin-only.
router.use(protect, authorize(ROLES.ADMIN));

router.get('/', listUsers);
router.post(
  '/',
  [
    body('name').isString().trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('password').isString().isLength({ min: 6 }),
    body('role').optional().isIn(Object.values(ROLES)),
  ],
  validate,
  createUser
);
router.put(
  '/:id',
  [
    body('role').optional().isIn(Object.values(ROLES)),
    body('active').optional().isBoolean(),
    body('password').optional().isString().isLength({ min: 6 }),
  ],
  validate,
  updateUser
);
router.delete('/:id', deleteUser);

export default router;
