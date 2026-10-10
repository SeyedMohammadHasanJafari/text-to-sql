import { Router } from 'express';
import { requireAuth } from '#middleware/requireAuth.js';
import { validate } from '#middleware/validate.js';
import * as controller from './dashboard.controller.js';
import { createPinSchema, pinIdParamSchema } from './dashboard.schemas.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get('/pins', controller.list);
dashboardRouter.post('/pins', validate({ body: createPinSchema }), controller.create);
dashboardRouter.delete('/pins/:id', validate({ params: pinIdParamSchema }), controller.remove);
