/**
 * Operational error with a stable, machine-readable `code`.
 * Anything that is NOT an AppError is treated as a bug and reported as a generic 500.
 */
export class AppError extends Error {
  constructor(status, code, message, { details, cause } = {}) {
    super(message, { cause });
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, details) => new AppError(400, 'BAD_REQUEST', message, { details });
export const unauthorized = (message = 'Authentication required') => new AppError(401, 'UNAUTHORIZED', message);
export const notFound = (message = 'Resource not found') => new AppError(404, 'NOT_FOUND', message);
export const conflict = (message) => new AppError(409, 'CONFLICT', message);

/** PostgreSQL SQLSTATE codes the application reacts to explicitly. */
export const PG_ERROR = Object.freeze({
  UNIQUE_VIOLATION: '23505',
});
