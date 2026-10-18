import { z } from 'zod';

export const createPaymentSchema = z.object({
  studentId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('EGP'),
  description: z.string().max(500).optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
});

export const updatePaymentSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'PARTIAL', 'EXEMPTED', 'OVERDUE']).optional(),
  paidAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
  receiptUrl: z.string().url().optional(),
});

export const createExemptionSchema = z.object({
  type: z.enum(['FULL', 'PARTIAL']),
  reason: z.string().min(1).max(500),
  exemptAmount: z.number().positive().optional(),
  exemptPercent: z.number().min(0).max(100).optional(),
}).refine(data => {
  if (data.type === 'PARTIAL' && !data.exemptAmount && !data.exemptPercent) {
    return false;
  }
  return true;
}, { message: 'Partial exemption requires exemptAmount or exemptPercent' });

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export type CreateExemptionInput = z.infer<typeof createExemptionSchema>;
