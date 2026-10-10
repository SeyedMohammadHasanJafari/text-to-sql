import pino from 'pino';
import { config } from '#config/env.js';

export const logger = pino({
  level: config.logLevel,
  redact: {
    paths: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]', '*.password'],
    censor: '[redacted]',
  },
  ...(config.isProduction
    ? {}
    : { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } } }),
});
