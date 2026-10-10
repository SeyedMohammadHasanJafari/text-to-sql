import { Router } from 'express';
import { authLimiter } from '#middleware/rateLimiters.js';
import { requireAuth } from '#middleware/requireAuth.js';
import { validate } from '#middleware/validate.js';
import * as controller from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.schemas.js';

export const authRouter = Router();

authRouter.post('/register', authLimiter, validate({ body: registerSchema }), controller.register);
authRouter.post('/login', authLimiter, validate({ body: loginSchema }), controller.login);
authRouter.post('/logout', controller.logout);
authRouter.get('/me', requireAuth, controller.me);
