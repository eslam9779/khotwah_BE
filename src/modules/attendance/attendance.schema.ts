import { z } from 'zod';

export const createSessionSchema = z.object({
  classId: z.string().uuid(),
  sessionDate: z.string().datetime(),
  topic: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

export const markAttendanceSchema = z.object({
  records: z.array(z.object({
    studentId: z.string().uuid(),
    status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
    notes: z.string().optional(),
  })).min(1),
});

export const qrAttendanceSchema = z.object({
  qrToken: z.string().min(1),
  studentId: z.string().uuid(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
export type QRAttendanceInput = z.infer<typeof qrAttendanceSchema>;
