/**
 * One-time (idempotent) database bootstrap — runs as the PostgreSQL SUPERUSER.
 *
 *  1. Creates/updates the two application roles from the credentials embedded
 *     in DATABASE_URL (app_admin) and AGENT_DATABASE_URL (readonly_agent).
 *  2. Creates the application database owned by app_admin.
 *  3. Applies the security hardening that defines the sandbox boundary.
 *
 * The superuser is used ONLY here; the running application never sees it.
 */
import { config } from '#config/env.js';
import { quoteIdentifier } from '#db/identifiers.js';
import { runScript, withClient } from './scriptUtils.js';

/** PostgreSQL 16+ is required for `GRANT ... WITH INHERIT FALSE, SET TRUE` and safe CREATEROLE semantics. */
const MIN_SERVER_VERSION = 160000;

function parseCredentials(url, label) {
  const parsed = new URL(url);
  const credentials = {
    role: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.slice(1)),
  };
  if (!credentials.role || !credentials.password || !credentials.database) {
    throw new Error(`${label} must include a user, a password and a database name`);
  }
  return credentials;
}

function superuserUrl(database) {
  const password = process.env.POSTGRES_SUPERUSER_PASSWORD;
  if (!password) throw new Error('POSTGRES_SUPERUSER_PASSWORD is required to bootstrap the database');

  const url = new URL(config.db.adminUrl);
  url.username = encodeURIComponent(process.env.POSTGRES_SUPERUSER || 'postgres');
  url.password = encodeURIComponent(password);
  url.pathname = `/${encodeURIComponent(database)}`;
  return url.toString();
}

async function assertServerVersion(client) {
  const { rows } = await client.query(`SELECT current_setting('server_version_num')::int AS version`);
  if (rows[0].version < MIN_SERVER_VERSION) {
    throw new Error(`PostgreSQL 16 or newer is required (found ${rows[0].version})`);
  }
}

async function upsertRole(client, { role, password }, attributes) {
  const { rowCount } = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [role]);
  const verb = rowCount ? 'ALTER' : 'CREATE';
  await client.query(`${verb} ROLE ${quoteIdentifier(role)} WITH ${attributes} PASSWORD ${client.escapeLiteral(password)}`);
  console.log(`  ✔ role ${role} ${rowCount ? 'updated' : 'created'}`);
}

async function ensureDatabase(client, { database, role }) {
  const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
  if (rowCount) {
    console.log(`  ✔ database ${database} already exists`);
    return;
  }
  await client.query(
    `CREATE DATABASE ${quoteIdentifier(database)} OWNER ${quoteIdentifier(role)} ENCODING 'UTF8' TEMPLATE template0`,
  );
  console.log(`  ✔ database ${database} created`);
}

/** The sandbox boundary, expressed in SQL. Every statement is idempotent. */
function hardeningSql({ database, adminRole, agentRole, statementTimeoutMs }) {
  const db = quoteIdentifier(database);
  const admin = quoteIdentifier(adminRole);
  const agent = quoteIdentifier(agentRole);
  const setConfig = 'pg_catalog.set_config(text, text, boolean)';

  return `
    -- No implicit access for anyone.
    REVOKE ALL ON DATABASE ${db} FROM PUBLIC;
    GRANT CONNECT, TEMPORARY ON DATABASE ${db} TO ${admin};
    -- CONNECT only: no TEMPORARY, because temp tables are allowed even in read-only transactions.
    GRANT CONNECT ON DATABASE ${db} TO ${agent};

    REVOKE ALL ON SCHEMA public FROM PUBLIC;

    -- set_config('role', ...) could switch roles from INSIDE a SELECT. Only the admin may call it.
    REVOKE EXECUTE ON FUNCTION ${setConfig} FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION ${setConfig} TO ${admin};

    -- System schema: owned by the admin, invisible to everyone else.
    CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION ${admin};
    REVOKE ALL ON SCHEMA app FROM PUBLIC;

    -- Session defaults for the agent: read-only, bounded in time, disk and locks.
    ALTER ROLE ${agent} IN DATABASE ${db} SET default_transaction_read_only = on;
    ALTER ROLE ${agent} IN DATABASE ${db} SET statement_timeout = ${statementTimeoutMs};
    ALTER ROLE ${agent} IN DATABASE ${db} SET lock_timeout = 1000;
    ALTER ROLE ${agent} IN DATABASE ${db} SET idle_in_transaction_session_timeout = 10000;
    ALTER ROLE ${agent} IN DATABASE ${db} SET temp_file_limit = '256MB';
    ALTER ROLE ${agent} IN DATABASE ${db} SET search_path = pg_catalog;
  `;
}

await runScript('Bootstrap', async () => {
  const admin = parseCredentials(config.db.adminUrl, 'DATABASE_URL');
  const agent = parseCredentials(config.db.agentUrl, 'AGENT_DATABASE_URL');

  if (admin.database !== agent.database) throw new Error('DATABASE_URL and AGENT_DATABASE_URL must target the same database');
  if (admin.role === agent.role) throw new Error('The admin and agent roles must be different');

  console.log('Bootstrapping PostgreSQL…');

  await withClient(superuserUrl('postgres'), async (client) => {
    await assertServerVersion(client);
    await upsertRole(client, admin, 'LOGIN NOSUPERUSER CREATEROLE NOCREATEDB NOREPLICATION NOBYPASSRLS');
    await upsertRole(
      client,
      agent,
      'LOGIN NOSUPERUSER NOCREATEROLE NOCREATEDB NOREPLICATION NOBYPASSRLS NOINHERIT CONNECTION LIMIT 20',
    );
    await ensureDatabase(client, admin);
  });

  await withClient(superuserUrl(admin.database), async (client) => {
    await client.query(
      hardeningSql({
        database: admin.database,
        adminRole: admin.role,
        agentRole: agent.role,
        statementTimeoutMs: config.sandbox.statementTimeoutMs,
      }),
    );
    console.log('  ✔ security hardening applied');
  });

  console.log('\n✔ Bootstrap complete. Next: npm run db:migrate');
});
