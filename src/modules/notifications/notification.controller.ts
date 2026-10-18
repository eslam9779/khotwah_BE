import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/prisma';
import { sendSuccess, AppError } from '../../utils/response';
import { CreateNotificationInput } from './notification.schema';

export async function listNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teacherId = req.teacherProfileId!;
    const notifications = await prisma.notification.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { _count: { select: { recipients: true } } },
    });
    sendSuccess(res, notifications);
  } catch (err) { next(err); }
}

export async function createNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = req.body as CreateNotificationInput;
    const teacherId = req.teacherProfileId!;
    
    // Determine target students
    let studentIds: string[] = [];
    
    if (data.targetAll) {
      const students = await prisma.student.findMany({
        where: { teacherId, isActive: true },
        select: { id: true },
      });
      studentIds = students.map((s: { id: string }) => s.id);
    } else if (data.targetClassId) {
      const cls = await prisma.class.findFirst({ where: { id: data.targetClassId, teacherId } });
      if (!cls) throw new AppError('Class not found', 'NOT_FOUND', 404);
      const enrollments = await prisma.classEnrollment.findMany({
        where: { classId: data.targetClassId, isActive: true },
        select: { studentId: true },
      });
      studentIds = enrollments.map((e: { studentId: string }) => e.studentId);
    } else if (data.targetStudentId) {
      const student = await prisma.student.findFirst({ where: { id: data.targetStudentId, teacherId } });
      if (!student) throw new AppError('Student not found', 'NOT_FOUND', 404);
      studentIds = [data.targetStudentId];
    }
    
    const notification = await prisma.$transaction(async (tx: typeof prisma) => {
      const notif = await tx.notification.create({ data: { ...data, teacherId } });
      if (studentIds.length > 0) {
        await tx.studentNotification.createMany({
          data: studentIds.map((studentId: string) => ({ notificationId: notif.id, studentId })),
          skipDuplicates: true,
        });
      }
      return notif;
    });
    
    sendSuccess(res, notification, { statusCode: 201 });
  } catch (err) { next(err); }
}
