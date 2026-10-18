import { z } from 'zod';

export const createFileSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  fileType: z.enum(['DOCUMENT', 'IMAGE', 'VIDEO', 'AUDIO', 'LINK', 'OTHER']).default('OTHER'),
  fileUrl: z.string().url(),
  mimeType: z.string().optional(),
  classId: z.string().uuid().optional(),
  isParentVisible: z.boolean().default(false),
  isStudentVisible: z.boolean().default(true),
});

export type CreateFileInput = z.infer<typeof createFileSchema>;
