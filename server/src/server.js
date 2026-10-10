import { createApp } from './app.js';
import { config } from '#config/env.js';
import { closePools } from '#db/pools.js';
import { logger } from '#lib/logger.js';

const SHUTDOWN_GRACE_MS = 10_000;

const server = createApp().listen(config.port, '0.0.0.0', () => {
  logger.info(`API listening on http://127.0.0.1:${config.port} (${config.env})`);
});

function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`);

  // Hard stop if in-flight requests hang.
  setTimeout(() => process.exit(1), SHUTDOWN_GRACE_MS).unref();

  server.close(async () => {
    await closePools();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  process.exit(1);
});
