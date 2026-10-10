import { quoteIdentifier } from '#db/identifiers.js';
import { adminPool } from '#db/pools.js';
import { withTransaction } from '#db/transaction.js';
import { sandboxFor } from '#sandbox/sandboxNaming.js';
import { coerceValue } from './typeInference.js';

const BATCH_SIZE = 500;

/**
 * Creates a physical table in the user's sandbox schema and inserts parsed rows.
 * Runs atomically inside a transaction with the admin pool.
 *
 * @param {string} userId
 * @param {string} tableName
 * @param {Array<{ column_name: string, original_name: string, data_type: string }>} columns
 * @param {Record<string, unknown>[]} rows
 * @returns {Promise<{ rowCount: number }>}
 */
export async function createSandboxTable(userId, tableName, columns, rows) {
  const { schema, readerRole } = sandboxFor(userId);
  const fullTableName = `${quoteIdentifier(schema)}.${quoteIdentifier(tableName)}`;

  return withTransaction(adminPool, async (client) => {
    // 1. Generate CREATE TABLE SQL
    const columnDefinitions = columns
      .map((col) => `${quoteIdentifier(col.column_name)} ${col.data_type}`)
      .join(',\n  ');

    const createTableSql = `
      CREATE TABLE ${fullTableName} (
        _row_id BIGSERIAL PRIMARY KEY,
        ${columnDefinitions}
      );
    `;

    await client.query(createTableSql);

    // 2. Grant SELECT on the new table to the sandbox reader role
    await client.query(`GRANT SELECT ON TABLE ${fullTableName} TO ${quoteIdentifier(readerRole)};`);

    // 3. Insert rows in parameterized chunks
    if (rows.length > 0) {
      await batchInsertRows(client, fullTableName, columns, rows);
    }

    return { rowCount: rows.length };
  });
}

/**
 * Inserts rows into the target table in multi-value parameterized batches.
 *
 * @param {import('pg').PoolClient} client
 * @param {string} fullTableName
 * @param {Array<{ column_name: string, original_name: string, data_type: string }>} columns
 * @param {Record<string, unknown>[]} rows
 */
async function batchInsertRows(client, fullTableName, columns, rows) {
  const colNames = columns.map((col) => quoteIdentifier(col.column_name)).join(', ');

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const valuePlaceholders = [];
    const flatParams = [];
    let paramIndex = 1;

    for (const row of chunk) {
      const rowPlaceholders = [];
      for (const col of columns) {
        const rawVal = row[col.original_name];
        const coerced = coerceValue(rawVal, col.data_type);
        flatParams.push(coerced);
        rowPlaceholders.push(`$${paramIndex}`);
        paramIndex += 1;
      }
      valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
    }

    const insertSql = `
      INSERT INTO ${fullTableName} (${colNames})
      VALUES ${valuePlaceholders.join(',\n')};
    `;

    await client.query(insertSql, flatParams);
  }
}

/**
 * Drops a physical table from the user's sandbox schema.
 *
 * @param {string} userId
 * @param {string} tableName
 */
export async function dropSandboxTable(userId, tableName) {
  const { schema } = sandboxFor(userId);
  const fullTableName = `${quoteIdentifier(schema)}.${quoteIdentifier(tableName)}`;

  await adminPool.query(`DROP TABLE IF EXISTS ${fullTableName} CASCADE;`);
}
