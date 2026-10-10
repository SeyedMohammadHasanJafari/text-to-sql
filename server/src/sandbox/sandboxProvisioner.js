import { config } from '#config/env.js';
import { quoteIdentifier } from '#db/identifiers.js';
import { sandboxFor } from './sandboxNaming.js';

/**
 * Creates the per-user sandbox. Must run on an `app_admin` client, ideally in
 * the same transaction that creates the user, so both succeed or neither does
 * (CREATE SCHEMA / CREATE ROLE are transactional in PostgreSQL).
 *
 * Resulting privilege graph:
 *
 *   readonly_agent ──(SET only, no INHERIT)──▶ sbx_<id>_reader ──▶ USAGE + SELECT on sbx_<id>
 *
 * The agent therefore has zero privileges until it explicitly does
 * `SET LOCAL ROLE sbx_<id>_reader`, and then sees exactly one user's data.
 *
 * @param {import('pg').PoolClient} client  admin connection
 * @param {string} userId
 */
export async function provisionSandbox(client, userId) {
  const { schema, readerRole } = sandboxFor(userId);
  const s = quoteIdentifier(schema);
  const r = quoteIdentifier(readerRole);
  const agent = quoteIdentifier(config.db.agentRole);

  await client.query(`
    CREATE SCHEMA ${s};
    REVOKE ALL ON SCHEMA ${s} FROM PUBLIC;
    CREATE ROLE ${r} NOLOGIN NOINHERIT;
    GRANT USAGE ON SCHEMA ${s} TO ${r};
    ALTER DEFAULT PRIVILEGES IN SCHEMA ${s} GRANT SELECT ON TABLES TO ${r};
    GRANT ${r} TO ${agent} WITH INHERIT FALSE, SET TRUE;
  `);
}

/**
 * Removes a sandbox and all of its tables. Idempotent.
 *
 * @param {import('pg').PoolClient} client  admin connection
 * @param {string} userId
 */
export async function deprovisionSandbox(client, userId) {
  const { schema, readerRole } = sandboxFor(userId);

  await client.query(`
    DROP SCHEMA IF EXISTS ${quoteIdentifier(schema)} CASCADE;
    DROP ROLE IF EXISTS ${quoteIdentifier(readerRole)};
  `);
}
