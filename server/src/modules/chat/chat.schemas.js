import { z } from 'zod';

export const sessionIdParamSchema = z.object({
  id: z.string().uuid('Invalid session ID format'),
});

export const createSessionSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1, 'Message cannot be empty').max(4000, 'Message is too long'),
});

export const deleteMessageParamsSchema = z.object({
  id: z.string().uuid('Invalid session ID format'),
  messageId: z.string().uuid('Invalid message ID format'),
});
