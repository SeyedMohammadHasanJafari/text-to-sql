/**
 * Data access for chat sessions and message history (`app.chat_sessions`, `app.chat_messages`).
 */

export async function insertSession(db, { userId, title = 'New chat' }) {
  const { rows } = await db.query(
    `INSERT INTO app.chat_sessions (user_id, title)
     VALUES ($1, $2)
     RETURNING id, user_id AS "userId", title, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [userId, title],
  );
  return rows[0];
}

export async function listSessions(db, userId) {
  const { rows } = await db.query(
    `SELECT s.id, s.title, s.created_at AS "createdAt", s.updated_at AS "updatedAt",
            COUNT(m.id)::int AS "messageCount"
     FROM app.chat_sessions s
     LEFT JOIN app.chat_messages m ON m.session_id = s.id
     WHERE s.user_id = $1
     GROUP BY s.id
     ORDER BY s.updated_at DESC`,
    [userId],
  );
  return rows;
}

export async function findSession(db, userId, sessionId) {
  const { rows } = await db.query(
    `SELECT id, user_id AS "userId", title, created_at AS "createdAt", updated_at AS "updatedAt"
     FROM app.chat_sessions
     WHERE user_id = $1 AND id = $2`,
    [userId, sessionId],
  );
  return rows[0] ?? null;
}

export async function updateSessionTitle(db, sessionId, title) {
  const { rows } = await db.query(
    `UPDATE app.chat_sessions
     SET title = $1
     WHERE id = $2
     RETURNING id, title`,
    [title, sessionId],
  );
  return rows[0] ?? null;
}

export async function deleteSessionRecord(db, userId, sessionId) {
  const { rows } = await db.query(
    `DELETE FROM app.chat_sessions
     WHERE user_id = $1 AND id = $2
     RETURNING id`,
    [userId, sessionId],
  );
  return rows[0] ?? null;
}

export async function insertMessage(db, { sessionId, role, content, sqlQuery = null, chartData = null }) {
  const { rows } = await db.query(
    `INSERT INTO app.chat_messages (session_id, role, content, sql_query, chart_data)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, session_id AS "sessionId", role, content,
               sql_query AS "sqlQuery", chart_data AS "chartData", created_at AS "createdAt"`,
    [sessionId, role, content, sqlQuery, chartData ? JSON.stringify(chartData) : null],
  );
  return rows[0];
}

export async function listSessionMessages(db, sessionId) {
  const { rows } = await db.query(
    `SELECT id, session_id AS "sessionId", role, content,
            sql_query AS "sqlQuery", chart_data AS "chartData", created_at AS "createdAt"
     FROM app.chat_messages
     WHERE session_id = $1
     ORDER BY created_at ASC`,
    [sessionId],
  );
  return rows;
}

export async function deleteSessionMessagesRecord(db, sessionId) {
  const { rowCount } = await db.query(
    `DELETE FROM app.chat_messages
     WHERE session_id = $1`,
    [sessionId],
  );
  return rowCount;
}

export async function deleteMessageRecord(db, sessionId, messageId) {
  const { rows } = await db.query(
    `DELETE FROM app.chat_messages
     WHERE session_id = $1 AND id = $2
     RETURNING id`,
    [sessionId, messageId],
  );
  return rows[0] ?? null;
}
