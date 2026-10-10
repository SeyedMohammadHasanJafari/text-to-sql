/**
 * Repository for dashboard pins (`app.dashboard_pins`).
 */

export async function insertPin(db, { userId, title, chartType, chartData, sqlQuery = null, sourceMessageId = null }) {
  const { rows } = await db.query(
    `INSERT INTO app.dashboard_pins (user_id, title, chart_type, chart_data, sql_query, source_message_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id AS "userId", title, chart_type AS "chartType",
               chart_data AS "chartData", sql_query AS "sqlQuery",
               source_message_id AS "sourceMessageId", position,
               created_at AS "createdAt"`,
    [userId, title, chartType, JSON.stringify(chartData), sqlQuery, sourceMessageId],
  );
  return rows[0];
}

export async function listUserPins(db, userId) {
  const { rows } = await db.query(
    `SELECT id, user_id AS "userId", title, chart_type AS "chartType",
            chart_data AS "chartData", sql_query AS "sqlQuery",
            source_message_id AS "sourceMessageId", position,
            created_at AS "createdAt"
     FROM app.dashboard_pins
     WHERE user_id = $1
     ORDER BY position ASC, created_at DESC`,
    [userId],
  );
  return rows;
}

export async function deletePinRecord(db, userId, pinId) {
  const { rows } = await db.query(
    `DELETE FROM app.dashboard_pins
     WHERE user_id = $1 AND id = $2
     RETURNING id`,
    [userId, pinId],
  );
  return rows[0] ?? null;
}
