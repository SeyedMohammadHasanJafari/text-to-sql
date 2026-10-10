import { AppError } from '#lib/errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF hardening that complements `SameSite=Strict` cookies: state-changing
 * requests must be JSON (or multipart for future uploads). HTML forms cannot
 * send `application/json` cross-site without a CORS preflight, which our
 * strict CORS policy rejects.
 */
export function requireJsonForMutations(req, _res, next) {
  // req.is() → null when there is no body, false when the type does not match.
  if (SAFE_METHODS.has(req.method) || req.is(['application/json', 'multipart/form-data']) !== false) {
    return next();
  }
  next(new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Requests must use application/json'));
}
