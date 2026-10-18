import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/prisma';
import { sendSuccess, AppError } from '../../utils/response';
import { writeAuditLog } from '../../utils/audit';
import { CreateClassInput, UpdateClassInput } from './class.schema';

export async function listClasses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teacherId = req.teacherProfileId!;
    const classes = await prisma.class.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { enrollments: true, attendanceSessions: true } },
      },
    });
    sendSuccess(res, classes);
  } catch (err) { next(err); }
}

export async function getClass(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { classId } = req.params;
    const teacherId = req.teacherProfileId!;
    const cls = await prisma.class.findFirst({
      where: { id: classId, teacherId },
      include: {
        enrollments: {
          where: { isActive: true },
          include: { student: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });
    if (!cls) throw new AppError('Class not found', 'NOT_FOUND', 404);
    sendSuccess(res, cls);
  } catch (err) { next(err); }
}

export async function createClass(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = req.body as CreateClassInput;
    const teacherId = req.teacherProfileId!;
    const cls = await prisma.class.create({
      data: { ...data, teacherId },
    });
    await writeAuditLog({ userId: req.user!.id, teacherId, action: 'class.create', resource: 'Class', resourceId: cls.id });
    sendSuccess(res, cls, { statusCode: 201 });
  } catch (err) { next(err); }
}

export async function updateClass(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { classId } = req.params;
    const teacherId = req.teacherProfileId!;
    const data = req.body as UpdateClassInput;
    const existing = await prisma.class.findFirst({ where: { id: classId, teacherId } });
    if (!existing) throw new AppError('Class not found', 'NOT_FOUND', 404);
    const updated = await prisma.class.update({ where: { id: classId }, data });
    sendSuccess(res, updated);
  } catch (err) { next(err); }
}

export async function deleteClass(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { classId } = req.params;
    const teacherId = req.teacherProfileId!;
    const existing = await prisma.class.findFirst({ where: { id: classId, teacherId } });
    if (!existing) throw new AppError('Class not found', 'NOT_FOUND', 404);
    await prisma.class.update({ where: { id: classId }, data: { isActive: false } });
    sendSuccess(res, null, { message: 'Class deactivated' });
  } catch (err) { next(err); }
}

export async function enrollStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { classId } = req.params;
    const teacherId = req.teacherProfileId!;
    const { studentId } = req.body as { studentId: string };
    // Verify class belongs to teacher
    const cls = await prisma.class.findFirst({ where: { id: classId, teacherId } });
    if (!cls) throw new AppError('Class not found', 'NOT_FOUND', 404);
    // Verify student belongs to teacher
    const student = await prisma.student.findFirst({ where: { id: studentId, teacherId } });
    if (!student) throw new AppError('Student not found in your workspace', 'NOT_FOUND', 404);
    // Create enrollment (upsert to avoid duplicate)
    const enrollment = await prisma.classEnrollment.upsert({
      where: { classId_studentId: { classId, studentId } },
      create: { classId, studentId, isActive: true },
      update: { isActive: true },
    });
    sendSuccess(res, enrollment, { statusCode: 201 });
  } catch (err) { next(err); }
}

export async function removeStudentFromClass(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { classId, studentId } = req.params;
    const teacherId = req.teacherProfileId!;
    const cls = await prisma.class.findFirst({ where: { id: classId, teacherId } });
    if (!cls) throw new AppError('Class not found', 'NOT_FOUND', 404);
    await prisma.classEnrollment.updateMany({
      where: { classId, studentId, class: { teacherId } },
      data: { isActive: false },
    });
    sendSuccess(res, null, { message: 'Student removed from class' });
  } catch (err) { next(err); }
}
