import { z } from 'zod';

export const createInvitationSchema = z.object({
  studentId: z.string().uuid(),
  invitedEmail: z.string().email().optional(),
  canViewAttendance: z.boolean().default(true),
  canViewGrades: z.boolean().default(true),
  canViewPayments: z.boolean().default(false),
  canViewAssessments: z.boolean().default(false),
  canViewFiles: z.boolean().default(false),
});

export const acceptInvitationSchema = z.object({
  token: z.string().uuid(),
});

export const updateLinkPermissionsSchema = z.object({
  canViewAttendance: z.boolean().optional(),
  canViewGrades: z.boolean().optional(),
  canViewPayments: z.boolean().optional(),
  canViewAssessments: z.boolean().optional(),
  canViewFiles: z.boolean().optional(),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type UpdateLinkPermissionsInput = z.infer<typeof updateLinkPermissionsSchema>;
