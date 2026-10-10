/**
 * Data access for `app.users`. Every function accepts a `db` (pool or client)
 * so callers decide whether it participates in a transaction.
 *
 * `password_hash` is only ever selected by `findCredentialsByEmail`.
 */
const PUBLIC_COLUMNS = `id, email, display_name AS "displayName", created_at AS "createdAt"`;

export async function insertUser(db, { email, passwordHash, displayName = null }) {
  const { rows } = await db.query(
    `INSERT INTO app.users (email, password_hash, display_name)
     VALUES ($1, $2, $3)
     RETURNING ${PUBLIC_COLUMNS}`,
    [email, passwordHash, displayName],
  );
  return rows[0];
}

export async function findUserById(db, id) {
  const { rows } = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM app.users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function findCredentialsByEmail(db, email) {
  const { rows } = await db.query(
    `SELECT ${PUBLIC_COLUMNS}, password_hash AS "passwordHash" FROM app.users WHERE email = $1`,
    [email],
  );
  return rows[0] ?? null;
}
