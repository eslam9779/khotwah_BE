import { z } from 'zod';

export const createAssessmentSchema = z.object({
  studentId: z.string().uuid(),
  category: z.enum(['BEHAVIORAL', 'ACADEMIC', 'SOCIAL', 'OTHER']).default('ACADEMIC'),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  score: z.number().int().min(1).max(5).optional(),
  maxScore: z.number().int().min(1).default(5).optional(),
  notes: z.string().max(1000).optional(),
});

export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;
