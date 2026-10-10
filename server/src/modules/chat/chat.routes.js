import { Router } from 'express';
import { requireAuth } from '#middleware/requireAuth.js';
import { validate } from '#middleware/validate.js';
import * as controller from './chat.controller.js';
import {
  createSessionSchema,
  deleteMessageParamsSchema,
  sendMessageSchema,
  sessionIdParamSchema,
} from './chat.schemas.js';

export const chatRouter = Router();

chatRouter.use(requireAuth);

chatRouter.get('/sessions', controller.list);
chatRouter.post('/sessions', validate({ body: createSessionSchema }), controller.create);
chatRouter.get('/sessions/:id', validate({ params: sessionIdParamSchema }), controller.getOne);
chatRouter.delete('/sessions/:id', validate({ params: sessionIdParamSchema }), controller.remove);
chatRouter.delete('/sessions/:id/messages', validate({ params: sessionIdParamSchema }), controller.clearMessages);
chatRouter.delete(
  '/sessions/:id/messages/:messageId',
  validate({ params: deleteMessageParamsSchema }),
  controller.removeMessage,
);
chatRouter.post(
  '/sessions/:id/messages',
  validate({ params: sessionIdParamSchema, body: sendMessageSchema }),
  controller.sendMessage,
);
chatRouter.post(
  '/sessions/:id/stop',
  validate({ params: sessionIdParamSchema }),
  controller.stopMessageGeneration,
);
