import { z } from 'zod';

export const createClassSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).optional(),
  subject: z.string().max(100).optional(),
  schedule: z.array(z.object({
    day: z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
  })).optional(),
});

export const updateClassSchema = createClassSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const enrollStudentSchema = z.object({
  studentId: z.string().uuid(),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
