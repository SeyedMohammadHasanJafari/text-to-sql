import jwt from 'jsonwebtoken';
import { config } from '#config/env.js';

const { jwtSecret, sessionTtlSeconds } = config.auth;

const JWT_OPTIONS = Object.freeze({
  algorithm: 'HS256',
  issuer: 'text-to-sql',
  audience: 'text-to-sql-client',
});

export function signSessionToken(userId) {
  return jwt.sign({}, jwtSecret, { ...JWT_OPTIONS, subject: userId, expiresIn: sessionTtlSeconds });
}

/** Returns the user id, or `null` for any invalid/expired token. */
export function verifySessionToken(token) {
  try {
    const payload = jwt.verify(token, jwtSecret, {
      algorithms: [JWT_OPTIONS.algorithm], // pin the algorithm: blocks `alg: none` / confusion attacks
      issuer: JWT_OPTIONS.issuer,
      audience: JWT_OPTIONS.audience,
    });
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
