import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

/**
 * Password hashing with Node's built-in scrypt (memory-hard, no native addon).
 * Stored format is self-describing so parameters can be raised later without
 * invalidating existing hashes:  scrypt$<N>$<r>$<p>$<salt-b64>$<hash-b64>
 */
const PARAMS = Object.freeze({ N: 2 ** 15, r: 8, p: 1, keyLength: 64, saltLength: 16 });
const MAX_MEMORY = 128 * PARAMS.N * PARAMS.r * 2;

async function derive(password, salt, { N, r, p, keyLength }) {
  return scryptAsync(password.normalize('NFKC'), salt, keyLength, { N, r, p, maxmem: MAX_MEMORY });
}

export async function hashPassword(password) {
  const salt = randomBytes(PARAMS.saltLength);
  const hash = await derive(password, salt, PARAMS);
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64'), hash.toString('base64')].join('$');
}

export async function verifyPassword(password, stored) {
  const [algorithm, N, r, p, saltB64, hashB64] = String(stored).split('$');
  if (algorithm !== 'scrypt' || !hashB64) return false;

  const expected = Buffer.from(hashB64, 'base64');
  const actual = await derive(password, Buffer.from(saltB64, 'base64'), {
    N: Number(N),
    r: Number(r),
    p: Number(p),
    keyLength: expected.length,
  });

  return timingSafeEqual(actual, expected);
}

/**
 * A valid hash of a random secret. Verifying against it when an account does
 * not exist keeps login timing identical, preventing user enumeration.
 */
export const DUMMY_PASSWORD_HASH = await hashPassword(randomBytes(32).toString('hex'));
