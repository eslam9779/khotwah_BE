import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/prisma';
import { sendSuccess, AppError } from '../../utils/response';
import { writeAuditLog } from '../../utils/audit';
import { CreateExamInput, UpdateExamInput, GradeStudentInput } from './exam.schema';

export async function listExams(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teacherId = req.teacherProfileId!;
    const exams = await prisma.exam.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { grades: true } } },
    });
    sendSuccess(res, exams);
  } catch (err) { next(err); }
}

export async function getExam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { examId } = req.params;
    const teacherId = req.teacherProfileId!;
    const exam = await prisma.exam.findFirst({
      where: { id: examId, teacherId },
      include: {
        grades: {
          include: { student: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });
    if (!exam) throw new AppError('Exam not found', 'NOT_FOUND', 404);
    sendSuccess(res, exam);
  } catch (err) { next(err); }
}

export async function createExam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = req.body as CreateExamInput;
    const teacherId = req.teacherProfileId!;
    if (data.classId) {
      const cls = await prisma.class.findFirst({ where: { id: data.classId, teacherId } });
      if (!cls) throw new AppError('Class not found', 'NOT_FOUND', 404);
    }
    const exam = await prisma.exam.create({
      data: { ...data, teacherId, examDate: data.examDate ? new Date(data.examDate) : undefined },
    });
    sendSuccess(res, exam, { statusCode: 201 });
  } catch (err) { next(err); }
}

export async function updateExam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { examId } = req.params;
    const teacherId = req.teacherProfileId!;
    const data = req.body as UpdateExamInput;
    const existing = await prisma.exam.findFirst({ where: { id: examId, teacherId } });
    if (!existing) throw new AppError('Exam not found', 'NOT_FOUND', 404);
    const updated = await prisma.exam.update({
      where: { id: examId },
      data: { ...data, examDate: data.examDate ? new Date(data.examDate) : undefined },
    });
    sendSuccess(res, updated);
  } catch (err) { next(err); }
}

export async function gradeStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { examId } = req.params;
    const teacherId = req.teacherProfileId!;
    const data = req.body as GradeStudentInput;
    const exam = await prisma.exam.findFirst({ where: { id: examId, teacherId } });
    if (!exam) throw new AppError('Exam not found', 'NOT_FOUND', 404);
    // Verify student belongs to teacher
    const student = await prisma.student.findFirst({ where: { id: data.studentId, teacherId } });
    if (!student) throw new AppError('Student not found in your workspace', 'NOT_FOUND', 404);
    const grade = await prisma.examGrade.upsert({
      where: { examId_studentId: { examId, studentId: data.studentId } },
      create: { examId, studentId: data.studentId, marksObtained: data.marksObtained, grade: data.grade, feedback: data.feedback, gradedById: teacherId },
      update: { marksObtained: data.marksObtained, grade: data.grade, feedback: data.feedback },
    });
    sendSuccess(res, grade);
  } catch (err) { next(err); }
}

export async function bulkGrade(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { examId } = req.params;
    const teacherId = req.teacherProfileId!;
    const { grades } = req.body as { grades: GradeStudentInput[] };
    const exam = await prisma.exam.findFirst({ where: { id: examId, teacherId } });
    if (!exam) throw new AppError('Exam not found', 'NOT_FOUND', 404);
    const results = await prisma.$transaction(
      grades.map(g => prisma.examGrade.upsert({
        where: { examId_studentId: { examId, studentId: g.studentId } },
        create: { examId, studentId: g.studentId, marksObtained: g.marksObtained, grade: g.grade, feedback: g.feedback, gradedById: teacherId },
        update: { marksObtained: g.marksObtained, grade: g.grade, feedback: g.feedback },
      }))
    );
    sendSuccess(res, results);
  } catch (err) { next(err); }
}
