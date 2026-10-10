import { performance } from 'node:perf_hooks';
import { config } from '#config/env.js';
import { quoteIdentifier } from '#db/identifiers.js';
import { agentPool } from '#db/pools.js';
import { withTransaction } from '#db/transaction.js';
import { AppError } from '#lib/errors.js';
import { sandboxFor } from './sandboxNaming.js';
import { assertReadOnlyQuery } from './sqlGuard.js';

/**
 * Low-level primitive: runs `work(client)` as the given user's sandbox reader.
 *
 * Layers enforced by PostgreSQL on every call:
 *  1. Connection is `readonly_agent` (no privileges of its own, no TEMP, no CREATE).
 *  2. `BEGIN READ ONLY` — any write (incl. data-modifying CTEs) is rejected.
 *  3. `SET LOCAL ROLE sbx_<id>_reader` — SELECT on exactly one user's schema.
 *  4. `statement_timeout` — runaway queries are cancelled.
 *  5. Always ROLLBACK — even session-level SETs are discarded before the
 *     connection returns to the pool.
 *
 * @template T
 * @param {string} userId
 * @param {(client: import('pg').PoolClient) => Promise<T>} work
 * @returns {Promise<T>}
 */
export function runInSandbox(userId, work, { timeoutMs = config.sandbox.statementTimeoutMs } = {}) {
  const { schema, readerRole } = sandboxFor(userId);

  return withTransaction(
    agentPool,
    async (client) => {
      await client.query(`
        SET LOCAL ROLE ${quoteIdentifier(readerRole)};
        SET LOCAL search_path TO ${quoteIdentifier(schema)};
        SET LOCAL statement_timeout = ${Math.trunc(timeoutMs)};
      `);
      return work(client);
    },
    { begin: 'BEGIN TRANSACTION READ ONLY', commit: false },
  );
}

/**
 * Executes AI-generated SQL safely and returns a compact, JSON-friendly result.
 *
 * The query is wrapped as a sub-select, which (a) forces it to be a query
 * expression, and (b) lets us cap the result size server-side. A bound
 * parameter forces the extended protocol, where PostgreSQL itself rejects
 * multiple statements.
 *
 * @param {string} userId
 * @param {string} rawSql
 * @returns {Promise<{ sql: string, columns: { name: string, dataTypeId: number }[],
 *   rows: unknown[][], rowCount: number, truncated: boolean, durationMs: number }>}
 */
export async function executeSandboxedQuery(userId, rawSql, { maxRows = config.sandbox.maxRows } = {}) {
  const sql = assertReadOnlyQuery(rawSql);
  const startedAt = performance.now();

  try {
    const result = await runInSandbox(userId, (client) =>
      client.query({
        text: `SELECT * FROM (\n${sql}\n) AS agent_result LIMIT $1`,
        values: [maxRows + 1],
        rowMode: 'array', // keeps duplicate column names (e.g. a.id, b.id) and is token-efficient for the LLM
      }),
    );

    const truncated = result.rows.length > maxRows;
    const rows = truncated ? result.rows.slice(0, maxRows) : result.rows;

    return {
      sql,
      columns: result.fields.map(({ name, dataTypeID }) => ({ name, dataTypeId: dataTypeID })),
      rows,
      rowCount: rows.length,
      truncated,
      durationMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    throw toSandboxError(error);
  }
}

/** SQLSTATE → stable error code. Messages stay descriptive so the LLM can self-correct. */
const SQLSTATE_CODES = Object.freeze({
  '57014': 'QUERY_TIMEOUT',
  '42501': 'PERMISSION_DENIED',
  '25006': 'READ_ONLY_VIOLATION',
});

function toSandboxError(error) {
  if (error instanceof AppError || typeof error?.code !== 'string' || error.code.length !== 5) {
    return error; // not a PostgreSQL error → let the global handler treat it
  }

  return new AppError(422, SQLSTATE_CODES[error.code] ?? 'SQL_ERROR', error.message, {
    details: { sqlState: error.code, position: error.position, hint: error.hint },
    cause: error,
  });
}
