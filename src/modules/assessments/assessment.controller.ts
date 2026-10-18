import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/prisma';
import { sendSuccess, AppError } from '../../utils/response';
import { CreateAssessmentInput } from './assessment.schema';

export async function listAssessments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teacherId = req.teacherProfileId!;
    const { studentId } = req.query as { studentId?: string };
    const assessments = await prisma.assessment.findMany({
      where: { teacherId, ...(studentId ? { studentId } : {}) },
      orderBy: { assessedAt: 'desc' },
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
    });
    sendSuccess(res, assessments);
  } catch (err) { next(err); }
}

export async function createAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = req.body as CreateAssessmentInput;
    const teacherId = req.teacherProfileId!;
    const student = await prisma.student.findFirst({ where: { id: data.studentId, teacherId } });
    if (!student) throw new AppError('Student not found', 'NOT_FOUND', 404);
    const assessment = await prisma.assessment.create({ data: { ...data, teacherId } });
    sendSuccess(res, assessment, { statusCode: 201 });
  } catch (err) { next(err); }
}

export async function deleteAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { assessmentId } = req.params;
    const teacherId = req.teacherProfileId!;
    const existing = await prisma.assessment.findFirst({ where: { id: assessmentId, teacherId } });
    if (!existing) throw new AppError('Assessment not found', 'NOT_FOUND', 404);
    await prisma.assessment.delete({ where: { id: assessmentId } });
    sendSuccess(res, null, { message: 'Assessment deleted' });
  } catch (err) { next(err); }
}
