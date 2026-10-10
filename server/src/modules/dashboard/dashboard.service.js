import { adminPool } from '#db/pools.js';
import { notFound } from '#lib/errors.js';
import { deletePinRecord, insertPin, listUserPins } from './dashboard.repository.js';

export async function pinChart(userId, { title, chartType, chartData, sqlQuery, sourceMessageId }) {
  return insertPin(adminPool, {
    userId,
    title,
    chartType,
    chartData,
    sqlQuery,
    sourceMessageId,
  });
}

export async function getPinnedCharts(userId) {
  return listUserPins(adminPool, userId);
}

export async function unpinChart(userId, pinId) {
  const deleted = await deletePinRecord(adminPool, userId, pinId);
  if (!deleted) {
    throw notFound('Pinned chart not found');
  }
  return { id: pinId, deleted: true };
}
