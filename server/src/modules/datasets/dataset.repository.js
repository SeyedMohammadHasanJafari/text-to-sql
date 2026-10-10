/**
 * Repository for dataset metadata and the Semantic Layer (`app.datasets`, `app.dataset_columns`).
 */

export async function insertDataset(db, { userId, tableName, originalFilename, status = 'processing', rowCount = 0 }) {
  const { rows } = await db.query(
    `INSERT INTO app.datasets (user_id, table_name, original_filename, status, row_count)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id AS "userId", table_name AS "tableName", original_filename AS "originalFilename",
               status, row_count AS "rowCount", error_message AS "errorMessage", created_at AS "createdAt", updated_at AS "updatedAt"`,
    [userId, tableName, originalFilename, status, rowCount],
  );
  return rows[0];
}

export async function insertDatasetColumns(db, datasetId, columns) {
  if (columns.length === 0) return [];

  const valuePlaceholders = [];
  const params = [];
  let pIdx = 1;

  for (const col of columns) {
    params.push(datasetId, col.ordinal, col.column_name, col.original_name, col.data_type, col.semantic_description || null);
    valuePlaceholders.push(`($${pIdx}, $${pIdx + 1}, $${pIdx + 2}, $${pIdx + 3}, $${pIdx + 4}, $${pIdx + 5})`);
    pIdx += 6;
  }

  const query = `
    INSERT INTO app.dataset_columns (dataset_id, ordinal, column_name, original_name, data_type, semantic_description)
    VALUES ${valuePlaceholders.join(', ')}
    RETURNING id, dataset_id AS "datasetId", ordinal, column_name AS "columnName",
              original_name AS "originalName", data_type AS "dataType", semantic_description AS "semanticDescription"
  `;

  const { rows } = await db.query(query, params);
  return rows;
}

export async function listUserDatasets(db, userId) {
  const query = `
    SELECT d.id, d.table_name AS "tableName", d.original_filename AS "originalFilename",
           d.status, d.row_count AS "rowCount", d.created_at AS "createdAt", d.updated_at AS "updatedAt",
           COALESCE(
             json_agg(
               json_build_object(
                 'id', c.id,
                 'ordinal', c.ordinal,
                 'columnName', c.column_name,
                 'originalName', c.original_name,
                 'dataType', c.data_type,
                 'semanticDescription', c.semantic_description
               ) ORDER BY c.ordinal
             ) FILTER (WHERE c.id IS NOT NULL), '[]'::json
           ) AS columns
    FROM app.datasets d
    LEFT JOIN app.dataset_columns c ON c.dataset_id = d.id
    WHERE d.user_id = $1
    GROUP BY d.id
    ORDER BY d.created_at DESC
  `;

  const { rows } = await db.query(query, [userId]);
  return rows;
}

export async function findUserDatasetById(db, userId, datasetId) {
  const query = `
    SELECT d.id, d.user_id AS "userId", d.table_name AS "tableName", d.original_filename AS "originalFilename",
           d.status, d.row_count AS "rowCount", d.error_message AS "errorMessage",
           d.created_at AS "createdAt", d.updated_at AS "updatedAt"
    FROM app.datasets d
    WHERE d.user_id = $1 AND d.id = $2
  `;

  const { rows } = await db.query(query, [userId, datasetId]);
  return rows[0] ?? null;
}

export async function getDatasetColumns(db, datasetId) {
  const query = `
    SELECT id, dataset_id AS "datasetId", ordinal, column_name AS "columnName",
           original_name AS "originalName", data_type AS "dataType", semantic_description AS "semanticDescription"
    FROM app.dataset_columns
    WHERE dataset_id = $1
    ORDER BY ordinal ASC
  `;

  const { rows } = await db.query(query, [datasetId]);
  return rows;
}

export async function updateColumnDescriptions(db, datasetId, updates) {
  for (const { id, semanticDescription } of updates) {
    await db.query(
      `UPDATE app.dataset_columns
       SET semantic_description = $1
       WHERE dataset_id = $2 AND id = $3`,
      [semanticDescription?.trim() || null, datasetId, id],
    );
  }
}

export async function deleteDatasetRecord(db, userId, datasetId) {
  const { rows } = await db.query(
    `DELETE FROM app.datasets
     WHERE user_id = $1 AND id = $2
     RETURNING id, table_name AS "tableName"`,
    [userId, datasetId],
  );
  return rows[0] ?? null;
}
