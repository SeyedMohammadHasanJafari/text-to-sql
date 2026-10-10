import { adminPool } from '#db/pools.js';
import { withTransaction } from '#db/transaction.js';
import { badRequest, notFound } from '#lib/errors.js';
import { logger } from '#lib/logger.js';
import { runInSandbox } from '#sandbox/sandboxExecutor.js';
import { quoteIdentifier } from '#db/identifiers.js';
import { sanitizeColumns, sanitizeTableName } from './columnSanitizer.js';
import {
  deleteDatasetRecord,
  findUserDatasetById,
  getDatasetColumns,
  insertDataset,
  insertDatasetColumns,
  listUserDatasets,
  updateColumnDescriptions,
} from './dataset.repository.js';
import { parseUploadedFile } from './fileParser.js';
import { createSandboxTable, dropSandboxTable } from './tableGenerator.js';
import { inferColumnTypes } from './typeInference.js';

/**
 * Ensures table name uniqueness for a specific user by appending an index suffix if needed.
 */
async function resolveUniqueTableName(userId, baseTableName) {
  const { rows } = await adminPool.query(
    'SELECT table_name FROM app.datasets WHERE user_id = $1 AND table_name LIKE $2',
    [userId, `${baseTableName}%`],
  );

  const existingNames = new Set(rows.map((r) => r.table_name));
  if (!existingNames.has(baseTableName)) {
    return baseTableName;
  }

  let counter = 2;
  while (counter < 1000) {
    const candidate = `${baseTableName.slice(0, 58)}_${counter}`;
    if (!existingNames.has(candidate)) {
      return candidate;
    }
    counter += 1;
  }

  return `${baseTableName.slice(0, 50)}_${Date.now()}`;
}

/**
 * End-to-end data ingestion pipeline:
 *  1. Parse CSV/XLSX file buffer
 *  2. Sanitize and disambiguate headers
 *  3. Infer PostgreSQL column types from rows
 *  4. Create physical table in user's isolated sandbox schema
 *  5. Stream rows into the physical table
 *  6. Store dataset & semantic layer metadata in app.datasets & app.dataset_columns
 */
export async function ingestDataset({ userId, file }) {
  if (!file || !file.buffer) {
    throw badRequest('No file uploaded or file buffer is empty');
  }

  logger.info({ userId, filename: file.originalname }, 'Starting dataset ingestion');

  // 1. Parse File
  const { headers, rows } = await parseUploadedFile(file);

  if (headers.length === 0) {
    throw badRequest('The uploaded file contains no recognizable columns');
  }

  // 2. Sanitize Columns and Table Name
  const sanitizedCols = sanitizeColumns(headers);
  const baseTableName = sanitizeTableName(file.originalname);
  const uniqueTableName = await resolveUniqueTableName(userId, baseTableName);

  // 3. Infer Types from Sample Rows (up to 500 rows)
  const sampleRows = rows.slice(0, 500);
  const typeMap = inferColumnTypes(sampleRows, sanitizedCols);

  const columnsWithTypes = sanitizedCols.map((col) => ({
    ...col,
    data_type: typeMap.get(col.column_name) || 'text',
  }));

  let createdDataset;

  try {
    // 4 & 5. Create physical table and insert rows
    await createSandboxTable(userId, uniqueTableName, columnsWithTypes, rows);

    // 6. Save metadata to system tables
    createdDataset = await withTransaction(adminPool, async (client) => {
      const dataset = await insertDataset(client, {
        userId,
        tableName: uniqueTableName,
        originalFilename: file.originalname,
        status: 'ready',
        rowCount: rows.length,
      });

      const cols = await insertDatasetColumns(client, dataset.id, columnsWithTypes);

      return {
        ...dataset,
        columns: cols,
      };
    });

    logger.info(
      { userId, datasetId: createdDataset.id, tableName: uniqueTableName, rowCount: rows.length },
      'Dataset ingestion completed successfully',
    );

    return createdDataset;
  } catch (error) {
    logger.error({ userId, err: error, tableName: uniqueTableName }, 'Failed during dataset ingestion');
    // Ensure orphan physical table in sandbox is dropped on failure
    await dropSandboxTable(userId, uniqueTableName).catch(() => {});
    throw error;
  }
}

/**
 * Retrieves all datasets for the authenticated user.
 */
export async function getUserDatasets(userId) {
  return listUserDatasets(adminPool, userId);
}

/**
 * Retrieves details of a specific dataset, its columns, and sample preview rows from the sandbox.
 */
export async function getDatasetWithPreview(userId, datasetId) {
  const dataset = await findUserDatasetById(adminPool, userId, datasetId);
  if (!dataset) {
    throw notFound('Dataset not found');
  }

  const columns = await getDatasetColumns(adminPool, datasetId);

  // Fetch sample rows (up to 15) securely using the user's sandbox reader connection
  let sampleRows = [];
  try {
    const previewResult = await runInSandbox(userId, async (client) => {
      return client.query(`SELECT * FROM ${quoteIdentifier(dataset.tableName)} LIMIT 15`);
    });
    sampleRows = previewResult.rows;
  } catch (err) {
    logger.warn({ userId, datasetId, err }, 'Unable to fetch preview rows from sandbox table');
  }

  return {
    ...dataset,
    columns,
    sampleRows,
  };
}

/**
 * Updates the semantic layer descriptions for columns of a dataset.
 */
export async function updateDatasetSemanticLayer(userId, datasetId, updates) {
  const dataset = await findUserDatasetById(adminPool, userId, datasetId);
  if (!dataset) {
    throw notFound('Dataset not found');
  }

  await withTransaction(adminPool, async (client) => {
    await updateColumnDescriptions(client, datasetId, updates);
  });

  return getDatasetColumns(adminPool, datasetId);
}

/**
 * Deletes a dataset: drops physical table in sandbox and deletes metadata.
 */
export async function deleteUserDataset(userId, datasetId) {
  const dataset = await findUserDatasetById(adminPool, userId, datasetId);
  if (!dataset) {
    throw notFound('Dataset not found');
  }

  // 1. Drop physical table in sandbox
  await dropSandboxTable(userId, dataset.tableName);

  // 2. Delete system record (cascades to columns)
  await deleteDatasetRecord(adminPool, userId, datasetId);

  return { id: datasetId, deleted: true };
}
