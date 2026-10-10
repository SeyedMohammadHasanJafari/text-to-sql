import { z } from 'zod';

export const pinIdParamSchema = z.object({
  id: z.string().uuid('Invalid pin ID format'),
});

export const createPinSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
  chartType: z.enum(['bar', 'line', 'pie']),
  chartData: z.record(z.string(), z.unknown()),
  sqlQuery: z.string().optional().nullable(),
  sourceMessageId: z.string().uuid('Invalid source message ID format').optional().nullable(),
});
