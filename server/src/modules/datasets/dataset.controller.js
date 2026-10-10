import { badRequest } from '#lib/errors.js';
import * as service from './dataset.service.js';

export async function upload(req, res) {
  if (!req.file) {
    throw badRequest('Please attach a file (.csv or .xlsx) to upload');
  }

  const dataset = await service.ingestDataset({
    userId: req.userId,
    file: req.file,
  });

  res.status(201).json({ dataset });
}

export async function list(req, res) {
  const datasets = await service.getUserDatasets(req.userId);
  res.json({ datasets });
}

export async function getOne(req, res) {
  const dataset = await service.getDatasetWithPreview(req.userId, req.validated.params.id);
  res.json({ dataset });
}

export async function updateSemantic(req, res) {
  const updatedColumns = await service.updateDatasetSemanticLayer(
    req.userId,
    req.validated.params.id,
    req.validated.body.columns,
  );
  res.json({ columns: updatedColumns });
}

export async function remove(req, res) {
  const result = await service.deleteUserDataset(req.userId, req.validated.params.id);
  res.json(result);
}
