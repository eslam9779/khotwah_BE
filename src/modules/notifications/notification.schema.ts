import { z } from 'zod';

export const createNotificationSchema = z.object({
  type: z.enum(['ATTENDANCE', 'PAYMENT', 'EXAM', 'ASSESSMENT', 'FILE', 'GENERAL', 'INVITATION']).default('GENERAL'),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  targetAll: z.boolean().default(false),
  targetClassId: z.string().uuid().optional(),
  targetStudentId: z.string().uuid().optional(),
  notifyParents: z.boolean().default(false),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
