import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

/**
 * Single source of truth for runtime configuration.
 *
 * The monorepo shares ONE `.env` file at the repository root (also consumed by
 * docker compose). It is loaded with Node's built-in `process.loadEnvFile`, so
 * no dotenv dependency is needed. Real environment variables always win.
 */
const ROOT_ENV_FILE = fileURLToPath(new URL('../../../.env', import.meta.url));

if (existsSync(ROOT_ENV_FILE)) {
  process.loadEnvFile(ROOT_ENV_FILE);
}

const postgresUrl = z
  .url()
  .refine((value) => /^postgres(ql)?:\/\//.test(value), 'Must be a postgres:// URL');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CLIENT_ORIGIN: z.url().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: postgresUrl,
  AGENT_DATABASE_URL: postgresUrl,

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(24 * 30).default(12),

  SANDBOX_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(100).max(60_000).default(5_000),
  SANDBOX_MAX_ROWS: z.coerce.number().int().min(1).max(10_000).default(500),

  AI_API_KEY: z.string().optional().default(''),
  AI_BASE_URL: z.string().url().default('https://api.avalai.ir/v1'),
  AI_MODEL: z.string().default('gpt-4o-mini'),
});

function loadConfig() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    // Fail fast: booting with a half-valid config is a security risk.
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }

  const env = parsed.data;

  return Object.freeze({
    env: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    port: env.PORT,
    clientOrigin: env.CLIENT_ORIGIN,
    logLevel: env.LOG_LEVEL,
    db: Object.freeze({
      adminUrl: env.DATABASE_URL,
      agentUrl: env.AGENT_DATABASE_URL,
      // Derived, not duplicated: the agent role is whoever AGENT_DATABASE_URL logs in as.
      agentRole: decodeURIComponent(new URL(env.AGENT_DATABASE_URL).username),
    }),
    auth: Object.freeze({
      jwtSecret: env.JWT_SECRET,
      sessionTtlSeconds: env.SESSION_TTL_HOURS * 60 * 60,
      cookieName: 'tts_session',
    }),
    sandbox: Object.freeze({
      statementTimeoutMs: env.SANDBOX_STATEMENT_TIMEOUT_MS,
      maxRows: env.SANDBOX_MAX_ROWS,
    }),
    ai: Object.freeze({
      apiKey: env.AI_API_KEY,
      baseUrl: env.AI_BASE_URL.replace(/\/+$/, ''), // strip trailing slash
      model: env.AI_MODEL,
      isConfigured: Boolean(env.AI_API_KEY && env.AI_API_KEY.trim()),
    }),
  });
}

export const config = loadConfig();
