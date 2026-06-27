import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  PRODUCT_CATEGORIES,
  PAYMENT_METHODS,
  STYLE_PREFERENCES,
  SEGMENTS,
} from '../config/constants.js';

export const getMeta = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: {
      categories: PRODUCT_CATEGORIES,
      paymentMethods: PAYMENT_METHODS,
      stylePreferences: STYLE_PREFERENCES,
      segments: Object.values(SEGMENTS),
    },
  });
});
