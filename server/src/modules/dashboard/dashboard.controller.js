import * as service from './dashboard.service.js';

export async function list(req, res) {
  const pins = await service.getPinnedCharts(req.userId);
  res.json({ pins });
}

export async function create(req, res) {
  const pin = await service.pinChart(req.userId, req.validated.body);
  res.status(201).json({ pin });
}

export async function remove(req, res) {
  const result = await service.unpinChart(req.userId, req.validated.params.id);
  res.json(result);
}
