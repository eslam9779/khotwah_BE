import { z } from 'zod';

export const createExamSchema = z.object({
  classId: z.string().uuid().optional(),
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).optional(),
  totalMarks: z.number().positive(),
  passingMarks: z.number().nonnegative().optional(),
  examDate: z.string().datetime().optional(),
});

export const updateExamSchema = createExamSchema.partial().extend({
  isPublished: z.boolean().optional(),
});

export const gradeStudentSchema = z.object({
  studentId: z.string().uuid(),
  marksObtained: z.number().nonnegative(),
  grade: z.string().max(5).optional(),
  feedback: z.string().max(1000).optional(),
});

export const bulkGradeSchema = z.object({
  grades: z.array(gradeStudentSchema).min(1),
});

export type CreateExamInput = z.infer<typeof createExamSchema>;
export type UpdateExamInput = z.infer<typeof updateExamSchema>;
export type GradeStudentInput = z.infer<typeof gradeStudentSchema>;
