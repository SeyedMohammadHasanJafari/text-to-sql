import pg from 'pg';

/** Runs a CLI entry point with uniform error reporting and exit codes. */
export async function runScript(name, main) {
  try {
    await main();
  } catch (error) {
    console.error(`\n✖ ${name} failed: ${error.message}`);
    process.exitCode = 1;
  }
}

/** Opens a single dedicated connection for `work` and always closes it. */
export async function withClient(connectionString, work) {
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const client = new pg.Client({
    connectionString,
    ssl: !isLocal ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  try {
    return await work(client);
  } finally {
    await client.end();
  }
}
