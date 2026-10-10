/**
 * PostgreSQL identifier helpers.
 *
 * Identifiers (schema/role/table names) cannot be bound as query parameters,
 * so every dynamic identifier must pass BOTH a strict allow-list check and
 * proper quoting before it is interpolated into SQL.
 */
const SAFE_IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/;

export function isSafeIdentifier(name) {
  return typeof name === 'string' && SAFE_IDENTIFIER.test(name);
}

export function quoteIdentifier(name) {
  if (!isSafeIdentifier(name)) {
    throw new Error(`Refusing to use unsafe SQL identifier: ${JSON.stringify(name)}`);
  }
  return `"${name}"`;
}
