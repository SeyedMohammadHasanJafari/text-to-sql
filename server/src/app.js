import { randomUUID } from 'node:crypto';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { config } from '#config/env.js';
import { logger } from '#lib/logger.js';
import { errorHandler, notFoundHandler } from '#middleware/errorHandler.js';
import { apiLimiter } from '#middleware/rateLimiters.js';
import { requireJsonForMutations } from '#middleware/requireJson.js';
import { authRouter } from '#modules/auth/auth.routes.js';
import { chatRouter } from '#modules/chat/chat.routes.js';
import { dashboardRouter } from '#modules/dashboard/dashboard.routes.js';
import { datasetRouter } from '#modules/datasets/dataset.routes.js';
import { healthRouter } from '#modules/health/health.routes.js';

/** Builds the Express application (no network side effects → easy to test). */
export function createApp() {
  const app = express();

  // Behind a reverse proxy in production: trust exactly one hop for client IPs (rate limiting).
  app.set('trust proxy', config.isProduction ? 1 : false);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      autoLogging: { ignore: (req) => req.url === '/api/health' },
    }),
  );
  app.use(helmet());
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use('/api', apiLimiter, requireJsonForMutations);
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/datasets', datasetRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/dashboard', dashboardRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
