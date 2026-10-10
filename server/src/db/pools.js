import pg from 'pg';
import { config } from '#config/env.js';
import { logger } from '#lib/logger.js';

/**
 * Two physically separate connection pools — the backbone of the sandbox model:
 *
 *  - adminPool: `app_admin`. Owns the system schema and the sandbox schemas.
 *    Used for trusted, application-authored SQL only.
 *  - agentPool: `readonly_agent`. Holds no privileges of its own; it can only
 *    borrow a single user's read-only sandbox role per transaction.
 *    AI-generated SQL must NEVER touch adminPool.
 */
function createPool(connectionString, name, overrides = {}) {
  const pool = new pg.Pool({
    connectionString,
    application_name: `text-to-sql:${name}`,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ...overrides,
  });

  pool.on('error', (error) => logger.error({ err: error, pool: name }, 'Idle PostgreSQL client error'));
  return pool;
}

export const adminPool = createPool(config.db.adminUrl, 'admin');
export const agentPool = createPool(config.db.agentUrl, 'agent', { max: 5 });

export async function closePools() {
  await Promise.allSettled([adminPool.end(), agentPool.end()]);
}
