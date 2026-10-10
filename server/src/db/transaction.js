/** Clients whose ROLLBACK failed are in an unknown state and must not be recycled. */
const brokenClients = new WeakSet();

/**
 * Runs `work(client)` inside a transaction on an already-acquired client.
 * Commits on success (or rolls back when `commit` is false), rolls back on error.
 *
 * @template T
 * @param {import('pg').ClientBase} client
 * @param {(client: import('pg').ClientBase) => Promise<T>} work
 * @param {{ begin?: string, commit?: boolean }} [options]
 *   `begin`  – custom BEGIN statement (e.g. 'BEGIN TRANSACTION READ ONLY');
 *   `commit` – set false to always roll back (read-only sandboxes).
 * @returns {Promise<T>}
 */
export async function inTransaction(client, work, { begin = 'BEGIN', commit = true } = {}) {
  await client.query(begin);
  try {
    const result = await work(client);
    await client.query(commit ? 'COMMIT' : 'ROLLBACK');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => brokenClients.add(client));
    throw error;
  }
}

/**
 * Acquires a client from `pool`, runs {@link inTransaction}, and always
 * releases it — destroying it instead if it was left in a broken state.
 *
 * @template T
 * @param {import('pg').Pool} pool
 * @param {(client: import('pg').PoolClient) => Promise<T>} work
 * @param {{ begin?: string, commit?: boolean }} [options]
 * @returns {Promise<T>}
 */
export async function withTransaction(pool, work, options) {
  const client = await pool.connect();
  try {
    return await inTransaction(client, work, options);
  } finally {
    client.release(brokenClients.has(client));
  }
}
