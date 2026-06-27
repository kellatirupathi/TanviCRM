import { Router } from 'express';
import {
  getSummary,
  getTopCustomers,
  getTopCategories,
  getRevenueTrend,
  getNewVsReturning,
} from '../controllers/analyticsController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/summary', getSummary);
router.get('/top-customers', getTopCustomers);
router.get('/top-categories', getTopCategories);
router.get('/revenue-trend', getRevenueTrend);
router.get('/new-vs-returning', getNewVsReturning);

export default router;
