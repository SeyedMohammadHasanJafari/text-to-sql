import { ZodError } from 'zod';
import { AppError } from '#lib/errors.js';

/** Unknown routes → uniform JSON 404 (never Express's HTML page). */
export function notFoundHandler(req, _res, next) {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `Route ${req.method} ${req.path} does not exist`));
}

/**
 * Central error boundary. Every error response has the same shape:
 *   { error: { code, message, details? } }
 * Internal details of unexpected errors are logged, never leaked to clients.
 */
// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity (4).
export function errorHandler(error, req, res, _next) {
  const normalized = normalize(error);

  if (normalized.status >= 500) {
    req.log.error({ err: error }, 'Unhandled error');
  }

  res.status(normalized.status).json({
    error: {
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details && { details: normalized.details }),
    },
  });
}

function normalize(error) {
  if (error instanceof AppError) return error;

  if (error instanceof ZodError) {
    return new AppError(400, 'VALIDATION_FAILED', 'Request validation failed', {
      details: error.issues.map(({ path, message }) => ({ field: path.join('.'), message })),
    });
  }

  // Malformed JSON bodies, oversized payloads, etc. raised by body parsers.
  if (error?.type === 'entity.parse.failed') return new AppError(400, 'INVALID_JSON', 'Malformed JSON body');
  if (error?.type === 'entity.too.large') return new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');

  return new AppError(500, 'INTERNAL_ERROR', 'Something went wrong');
}
