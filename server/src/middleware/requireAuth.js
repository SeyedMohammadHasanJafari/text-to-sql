import { config } from '#config/env.js';
import { unauthorized } from '#lib/errors.js';
import { verifySessionToken } from '#lib/tokens.js';

/** Requires a valid session cookie; exposes the caller as `req.userId`. */
export function requireAuth(req, _res, next) {
  const userId = verifySessionToken(req.cookies?.[config.auth.cookieName] ?? '');
  if (!userId) {
    return next(unauthorized());
  }

  req.userId = userId;
  next();
}
