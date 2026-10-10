import { adminPool } from '#db/pools.js';
import { withTransaction } from '#db/transaction.js';
import { AppError, PG_ERROR, conflict, unauthorized } from '#lib/errors.js';
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from '#lib/password.js';
import { provisionSandbox } from '#sandbox/sandboxProvisioner.js';
import { findCredentialsByEmail, findUserById, insertUser } from './user.repository.js';

/**
 * Creates the account and its isolated data sandbox atomically:
 * a user without a sandbox (or vice-versa) can never exist.
 */
export async function registerUser({ email, password, displayName }) {
  const passwordHash = await hashPassword(password);

  try {
    return await withTransaction(adminPool, async (client) => {
      const user = await insertUser(client, { email, passwordHash, displayName });
      await provisionSandbox(client, user.id);
      return user;
    });
  } catch (error) {
    if (error.code === PG_ERROR.UNIQUE_VIOLATION && error.constraint === 'users_email_key') {
      throw conflict('An account with this email already exists');
    }
    throw error;
  }
}

export async function authenticate({ email, password }) {
  const record = await findCredentialsByEmail(adminPool, email);

  // Always run the hash comparison so response time does not reveal whether the email exists.
  const passwordMatches = await verifyPassword(password, record?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (!record || !passwordMatches) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const { passwordHash: _omit, ...user } = record;
  return user;
}

export async function getCurrentUser(userId) {
  const user = await findUserById(adminPool, userId);
  if (!user) throw unauthorized('Session is no longer valid'); // e.g. account deleted
  return user;
}
