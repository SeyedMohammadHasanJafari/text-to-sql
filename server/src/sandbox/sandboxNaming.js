const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Deterministically maps a user id to that user's isolated sandbox.
 *
 * Deriving names (instead of storing them) keeps a single source of truth and
 * guarantees they are always safe identifiers: `sbx_` + 32 hex chars.
 *
 *  - schema:     holds the user's uploaded dataset tables
 *  - readerRole: NOLOGIN role with USAGE + SELECT on that schema only
 *
 * @param {string} userId UUID of the owning user
 * @returns {Readonly<{ schema: string, readerRole: string }>}
 */
export function sandboxFor(userId) {
  if (typeof userId !== 'string' || !UUID_PATTERN.test(userId)) {
    throw new TypeError('sandboxFor() expects a UUID user id');
  }

  const key = userId.toLowerCase().replaceAll('-', '');
  return Object.freeze({ schema: `sbx_${key}`, readerRole: `sbx_${key}_reader` });
}
