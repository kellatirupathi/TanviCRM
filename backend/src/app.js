import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());

  const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  // Optionally allow all *.vercel.app preview deployments (set ALLOW_VERCEL_PREVIEWS=true).
  const allowVercelPreviews = process.env.ALLOW_VERCEL_PREVIEWS === 'true';
  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow same-origin / curl / server-to-server (no Origin header).
        if (!origin) return cb(null, true);
        if (origins.includes(origin)) return cb(null, true);
        if (allowVercelPreviews && /\.vercel\.app$/.test(new URL(origin).hostname)) {
          return cb(null, true);
        }
        return cb(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Global rate limiter (sensitive customer data, brute-force protection).
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'test' ? 100000 : 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { message: 'Too many requests, please slow down' } },
  });
  app.use('/api', limiter);

  // Tighter limiter specifically for auth to throttle credential stuffing.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'test' ? 100000 : 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { message: 'Too many login attempts, try again later' } },
  });
  app.use('/api/auth/login', authLimiter);

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
