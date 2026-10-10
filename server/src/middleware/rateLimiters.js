import { rateLimit } from 'express-rate-limit';
import { AppError } from '#lib/errors.js';

function limiter({ windowMinutes, limit, message }) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new AppError(429, 'RATE_LIMITED', message)),
  });
}

/** Baseline protection for the whole API. */
export const apiLimiter = limiter({
  windowMinutes: 1,
  limit: 300,
  message: 'Too many requests, please slow down',
});

/** Strict limit on credential endpoints to blunt brute-force and credential stuffing. */
export const authLimiter = limiter({
  windowMinutes: 15,
  limit: 20,
  message: 'Too many authentication attempts, please try again later',
});
