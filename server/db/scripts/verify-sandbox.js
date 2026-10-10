/**
 * Security verification for the Postgres sandbox (`npm run db:verify-sandbox`).
 *
 * Creates two throw-away tenants (A and B) with a table each, then attacks the
 * sandbox from tenant A on two levels:
 *
 *  - DATABASE layer: raw statements via `runInSandbox`, bypassing the SQL guard,
 *    to prove PostgreSQL itself enforces the boundary.
 *  - PIPELINE layer: the real `executeSandboxedQuery` entry point the AI uses.
 *
 * Exits with code 1 if any expectation fails. Always cleans up after itself.
 */
import { randomUUID } from 'node:crypto';
import { quoteIdentifier } from '#db/identifiers.js';
import { adminPool, agentPool, closePools } from '#db/pools.js';
import { withTransaction } from '#db/transaction.js';
import { executeSandboxedQuery, runInSandbox } from '#sandbox/sandboxExecutor.js';
import { sandboxFor } from '#sandbox/sandboxNaming.js';
import { deprovisionSandbox, provisionSandbox } from '#sandbox/sandboxProvisioner.js';
import { runScript } from './scriptUtils.js';

const TABLE = 'secret_sales';

async function createTenant(label) {
  const id = randomUUID();
  const { schema } = sandboxFor(id);

  await withTransaction(adminPool, async (client) => {
    await client.query(`INSERT INTO app.users (id, email, password_hash) VALUES ($1, $2, 'not-a-real-hash')`, [
      id,
      `verify-${label}-${id}@sandbox.invalid`,
    ]);
    await provisionSandbox(client, id);
    await client.query(`
      CREATE TABLE ${quoteIdentifier(schema)}.${TABLE} (id int PRIMARY KEY, amount numeric NOT NULL);
      INSERT INTO ${quoteIdentifier(schema)}.${TABLE} VALUES (1, 100), (2, 250);
    `);
  });

  return { id, ...sandboxFor(id) };
}

async function destroyTenant({ id }) {
  await withTransaction(adminPool, async (client) => {
    await deprovisionSandbox(client, id);
    await client.query('DELETE FROM app.users WHERE id = $1', [id]);
  });
}

function buildChecks(a, b) {
  const raw = (sql, options) => () => runInSandbox(a.id, (client) => client.query(sql), options);
  const pipeline = (sql) => () => executeSandboxedQuery(a.id, sql);

  return [
    ['DATABASE', 'allow', 'SELECT own table', raw(`SELECT sum(amount) FROM ${TABLE}`)],
    ['DATABASE', 'deny', 'INSERT', raw(`INSERT INTO ${TABLE} VALUES (3, 1)`)],
    ['DATABASE', 'deny', 'UPDATE', raw(`UPDATE ${TABLE} SET amount = 0`)],
    ['DATABASE', 'deny', 'DELETE', raw(`DELETE FROM ${TABLE}`)],
    ['DATABASE', 'deny', 'DROP TABLE', raw(`DROP TABLE ${TABLE}`)],
    ['DATABASE', 'deny', 'ALTER TABLE', raw(`ALTER TABLE ${TABLE} ADD COLUMN x int`)],
    ['DATABASE', 'deny', 'CREATE TABLE', raw('CREATE TABLE evil (id int)')],
    ['DATABASE', 'deny', 'CREATE TEMP TABLE', raw('CREATE TEMP TABLE evil (id int)')],
    ['DATABASE', 'deny', 'Read system schema (app.users)', raw('SELECT * FROM app.users')],
    ['DATABASE', 'deny', "Read tenant B's table", raw(`SELECT * FROM ${b.schema}.${TABLE}`)],
    ['DATABASE', 'deny', 'set_config() role switch', raw(`SELECT set_config('role', '${b.readerRole}', true)`)],
    [
      'DATABASE',
      'deny',
      'Multi-statement (extended protocol)',
      () =>
        runInSandbox(a.id, (client) =>
          client.query({ text: `SET ROLE ${b.readerRole}; SELECT * FROM ${b.schema}.${TABLE}`, queryMode: 'extended' }),
        ),
    ],
    ['DATABASE', 'deny', 'Runaway query (timeout)', raw('SELECT pg_sleep(5)', { timeoutMs: 300 })],
    ['DATABASE', 'deny', 'Agent without role switch', () => agentPool.query(`SELECT * FROM ${a.schema}.${TABLE}`)],

    ['PIPELINE', 'allow', 'Aggregate query', pipeline(`SELECT id, amount FROM ${TABLE} ORDER BY id;`)],
    ['PIPELINE', 'deny', 'DELETE', pipeline(`DELETE FROM ${TABLE}`)],
    ['PIPELINE', 'deny', 'Stacked statements', pipeline(`SELECT 1; DROP TABLE ${TABLE}`)],
    ['PIPELINE', 'deny', 'SET ROLE to tenant B', pipeline(`SET ROLE ${b.readerRole}`)],
    ['PIPELINE', 'deny', 'Quoted "set_config"', pipeline(`SELECT "set_config"('role', '${b.readerRole}', true)`)],
    ['PIPELINE', 'deny', 'Data-modifying CTE', pipeline(`WITH d AS (DELETE FROM ${TABLE} RETURNING *) SELECT * FROM d`)],
    ['PIPELINE', 'deny', 'Sub-select breakout', pipeline(`SELECT 1) x; DROP TABLE ${TABLE}; SELECT * FROM (SELECT 1`)],
  ];
}

async function runCheck([layer, expectation, name, attempt]) {
  try {
    await attempt();
    return { layer, name, expectation, passed: expectation === 'allow', outcome: 'allowed' };
  } catch (error) {
    const reason = `${error.code ?? 'ERROR'}: ${error.message}`.split('\n')[0].slice(0, 90);
    return { layer, name, expectation, passed: expectation === 'deny', outcome: `blocked (${reason})` };
  }
}

await runScript('Sandbox verification', async () => {
  const tenants = [];
  try {
    tenants.push(await createTenant('a'), await createTenant('b'));
    const [a, b] = tenants;

    const results = [];
    for (const check of buildChecks(a, b)) {
      results.push(await runCheck(check)); // sequential: deterministic output, no pool contention
    }

    console.log('\nPostgres sandbox verification\n');
    for (const { layer, name, expectation, passed, outcome } of results) {
      console.log(`${passed ? '✔' : '✖'} [${layer}] ${name.padEnd(38)} expect ${expectation.padEnd(5)} → ${outcome}`);
    }

    const failures = results.filter((result) => !result.passed).length;
    console.log(`\n${results.length - failures}/${results.length} checks passed`);
    if (failures) throw new Error(`${failures} security expectation(s) violated`);
  } finally {
    await Promise.all(tenants.map(destroyTenant));
    await closePools();
  }
});
