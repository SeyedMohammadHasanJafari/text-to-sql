import { z } from 'zod';

export const datasetIdParamSchema = z.object({
  id: z.string().uuid('Invalid dataset ID format'),
});

export const updateSemanticDescriptionsSchema = z.object({
  columns: z.array(
    z.object({
      id: z.string().uuid('Invalid column ID format'),
      semanticDescription: z.string().max(500, 'Description must not exceed 500 characters').nullable().optional(),
    }),
  ).min(1, 'At least one column description must be provided'),
});
