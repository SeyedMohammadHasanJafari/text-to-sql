import { Router } from 'express';
import multer from 'multer';
import { badRequest } from '#lib/errors.js';
import { requireAuth } from '#middleware/requireAuth.js';
import { validate } from '#middleware/validate.js';
import * as controller from './dataset.controller.js';
import { datasetIdParamSchema, updateSemanticDescriptionsSchema } from './dataset.schemas.js';

export const datasetRouter = Router();

// In-memory file buffer (up to 25 MB)
const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
      cb(null, true);
    } else {
      cb(badRequest('Only .csv and .xlsx files are supported'));
    }
  },
});

// All dataset endpoints require authentication
datasetRouter.use(requireAuth);

datasetRouter.post('/upload', uploadMiddleware.single('file'), controller.upload);
datasetRouter.get('/', controller.list);
datasetRouter.get('/:id', validate({ params: datasetIdParamSchema }), controller.getOne);
datasetRouter.patch(
  '/:id/columns',
  validate({ params: datasetIdParamSchema, body: updateSemanticDescriptionsSchema }),
  controller.updateSemantic,
);
datasetRouter.delete('/:id', validate({ params: datasetIdParamSchema }), controller.remove);
