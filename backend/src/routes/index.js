import { Router } from 'express';
import authRoutes from './authRoutes.js';
import customerRoutes from './customerRoutes.js';
import purchaseRoutes from './purchaseRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import userRoutes from './userRoutes.js';
import { protect } from '../middleware/auth.js';
import { getMeta } from '../controllers/metaController.js';

const router = Router();

router.get('/health', (_req, res) =>
  res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } })
);

router.use('/auth', authRoutes);
router.get('/meta', protect, getMeta);
router.use('/customers', customerRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/users', userRoutes);

export default router;
