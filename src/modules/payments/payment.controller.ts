import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/prisma';
import { sendSuccess, AppError } from '../../utils/response';
import { writeAuditLog } from '../../utils/audit';
import { CreatePaymentInput, UpdatePaymentInput, CreateExemptionInput } from './payment.schema';

export async function listPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teacherId = req.teacherProfileId!;
    const { studentId, status } = req.query as { studentId?: string; status?: string };
    const payments = await prisma.payment.findMany({
      where: {
        student: { teacherId },
        ...(studentId ? { studentId } : {}),
        ...(status ? { status: status as 'PENDING' | 'PAID' | 'PARTIAL' | 'EXEMPTED' | 'OVERDUE' } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        exemption: true,
      },
    });
    sendSuccess(res, payments);
  } catch (err) { next(err); }
}

export async function createPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = req.body as CreatePaymentInput;
    const teacherId = req.teacherProfileId!;
    // Verify student belongs to teacher
    const student = await prisma.student.findFirst({ where: { id: data.studentId, teacherId } });
    if (!student) throw new AppError('Student not found in your workspace', 'NOT_FOUND', 404);
    const payment = await prisma.payment.create({
      data: {
        ...data,
        teacherId,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });
    await writeAuditLog({ userId: req.user!.id, teacherId, action: 'payment.create', resourceId: payment.id });
    sendSuccess(res, payment, { statusCode: 201 });
  } catch (err) { next(err); }
}

export async function updatePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { paymentId } = req.params;
    const teacherId = req.teacherProfileId!;
    const data = req.body as UpdatePaymentInput;
    const existing = await prisma.payment.findFirst({
      where: { id: paymentId, student: { teacherId } },
    });
    if (!existing) throw new AppError('Payment not found', 'NOT_FOUND', 404);
    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: { ...data, paidAt: data.paidAt ? new Date(data.paidAt) : undefined },
    });
    sendSuccess(res, updated);
  } catch (err) { next(err); }
}

export async function addExemption(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { paymentId } = req.params;
    const teacherId = req.teacherProfileId!;
    const data = req.body as CreateExemptionInput;
    const existing = await prisma.payment.findFirst({
      where: { id: paymentId, student: { teacherId } },
    });
    if (!existing) throw new AppError('Payment not found', 'NOT_FOUND', 404);
    const [exemption] = await prisma.$transaction([
      prisma.paymentExemption.create({
        data: { paymentId, ...data, exemptAmount: data.exemptAmount, exemptPercent: data.exemptPercent, approvedById: teacherId },
      }),
      prisma.payment.update({
        where: { id: paymentId },
        data: { status: data.type === 'FULL' ? 'EXEMPTED' : 'PARTIAL' },
      }),
    ]);
    await writeAuditLog({ userId: req.user!.id, teacherId, action: 'payment.exemption', resourceId: paymentId, metadata: { type: data.type } });
    sendSuccess(res, exemption, { statusCode: 201 });
  } catch (err) { next(err); }
}
