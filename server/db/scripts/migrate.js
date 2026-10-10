/**
 * Minimal, dependency-free migration runner.
 *
 *  - Applies `db/migrations/NNN_name.sql` files in order, each in its own transaction.
 *  - Records a SHA-256 checksum; editing an already-applied migration is an error.
 *  - A session advisory lock prevents concurrent runners.
 */
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '#config/env.js';
import { inTransaction } from '#db/transaction.js';
import { runScript, withClient } from './scriptUtils.js';

const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations/', import.meta.url));
const MIGRATION_FILE = /^\d{3}_[a-z0-9_]+\.sql$/;
const ADVISORY_LOCK_KEY = 4_271_993; // arbitrary, app-wide constant

const checksumOf = (sql) => createHash('sha256').update(sql.replaceAll('\r\n', '\n')).digest('hex');

async function loadMigrations() {
  const files = (await readdir(MIGRATIONS_DIR)).filter((file) => MIGRATION_FILE.test(file)).sort();

  return Promise.all(
    files.map(async (file) => {
      const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
      return { version: file.replace(/\.sql$/, ''), sql, checksum: checksumOf(sql) };
    }),
  );
}

await runScript('Migration', () =>
  withClient(config.db.adminUrl, async (client) => {
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]); // released when the connection closes
    await client.query('CREATE SCHEMA IF NOT EXISTS app;');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.schema_migrations (
        version    text        PRIMARY KEY,
        checksum   text        NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`);

    const { rows } = await client.query('SELECT version, checksum FROM app.schema_migrations');
    const applied = new Map(rows.map(({ version, checksum }) => [version, checksum]));

    let appliedCount = 0;
    for (const { version, sql, checksum } of await loadMigrations()) {
      if (applied.has(version)) {
        if (applied.get(version) !== checksum) {
          throw new Error(`Migration ${version} was modified after being applied; add a new migration instead`);
        }
        continue;
      }

      await inTransaction(client, async () => {
        await client.query(sql);
        await client.query('INSERT INTO app.schema_migrations (version, checksum) VALUES ($1, $2)', [version, checksum]);
      });
      console.log(`  ✔ applied ${version}`);
      appliedCount += 1;
    }

    console.log(appliedCount ? `\n✔ ${appliedCount} migration(s) applied` : '✔ Database is up to date');
  }),
);
