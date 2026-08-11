import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import healthRoutes from './routes/public/health.routes.js';
import routes from './routes/index.js';
import { globalRateLimiter } from './middlewares/rateLimit.middleware.js';
import { sanitizeMiddleware } from './middlewares/sanitize.middleware.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: [env.CLIENT_ORIGIN, env.CLIENT_ORIGIN_WWW, env.ADMIN_ORIGIN].filter(Boolean),
    credentials: true,
  })
);
app.use(compression());
app.use(
  express.json({
    limit: '1mb',
    // Stashes the exact raw bytes alongside the parsed body — the Razorpay
    // webhook route needs the untouched payload to verify its HMAC signature;
    // re-serializing the parsed JSON would not byte-for-byte match what
    // Razorpay signed.
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(pinoHttp({ logger }));

// Health check mounted before the rate limiter so monitoring never gets throttled.
app.use('/api/health', healthRoutes);

app.use('/api', globalRateLimiter);
app.use(sanitizeMiddleware);

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);
