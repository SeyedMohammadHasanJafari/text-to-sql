import { config } from '#config/env.js';
import { signSessionToken } from '#lib/tokens.js';
import { authenticate, getCurrentUser, registerUser } from './auth.service.js';

const { cookieName, sessionTtlSeconds } = config.auth;

const SESSION_COOKIE = Object.freeze({
  httpOnly: true, // unreachable from JavaScript → immune to token theft via XSS
  secure: config.isProduction,
  sameSite: 'strict',
  path: '/api',
});

function startSession(res, user) {
  res.cookie(cookieName, signSessionToken(user.id), { ...SESSION_COOKIE, maxAge: sessionTtlSeconds * 1000 });
}

export async function register(req, res) {
  const user = await registerUser(req.validated.body);
  startSession(res, user);
  res.status(201).json({ user });
}

export async function login(req, res) {
  const user = await authenticate(req.validated.body);
  startSession(res, user);
  res.json({ user });
}

export function logout(_req, res) {
  res.clearCookie(cookieName, SESSION_COOKIE);
  res.status(204).end();
}

export async function me(req, res) {
  res.json({ user: await getCurrentUser(req.userId) });
}
