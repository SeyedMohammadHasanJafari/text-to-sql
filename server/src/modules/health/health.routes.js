import { Router } from 'express';
import { adminPool, agentPool } from '#db/pools.js';

export const healthRouter = Router();

async function probe(pool) {
  try {
    await pool.query('SELECT 1');
    return 'up';
  } catch {
    return 'down';
  }
}

/** Liveness + dependency check for both connection paths (system DB and sandbox). */
healthRouter.get('/', async (_req, res) => {
  const [database, sandbox] = await Promise.all([probe(adminPool), probe(agentPool)]);
  const healthy = database === 'up' && sandbox === 'up';

  res
    .status(healthy ? 200 : 503)
    .set('Cache-Control', 'no-store')
    .json({
      status: healthy ? 'ok' : 'degraded',
      services: { database, sandbox },
      uptimeSeconds: Math.round(process.uptime()),
    });
});
