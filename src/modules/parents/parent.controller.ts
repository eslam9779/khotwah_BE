import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/prisma';
import { sendSuccess, sendError, AppError } from '../../utils/response';
import { writeAuditLog } from '../../utils/audit';
import { addDays } from '../../utils/auth';
import { CreateInvitationInput, AcceptInvitationInput, UpdateLinkPermissionsInput } from './parent.schema';

// ============================================================
// TEACHER ENDPOINTS - manage parent invitations
// ============================================================

export async function createInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = req.body as CreateInvitationInput;
    const teacherId = req.teacherProfileId!;
    // Verify student belongs to teacher
    const student = await prisma.student.findFirst({ where: { id: data.studentId, teacherId } });
    if (!student) throw new AppError('Student not found in your workspace', 'NOT_FOUND', 404);
    const invitation = await prisma.parentInvitation.create({
      data: {
        ...data,
        teacherId,
        expiresAt: addDays(new Date(), 7),
      },
    });
    await writeAuditLog({ userId: req.user!.id, teacherId, action: 'parent.invitation.create', resourceId: invitation.id });
    sendSuccess(res, { token: invitation.token, expiresAt: invitation.expiresAt }, { statusCode: 201 });
  } catch (err) { next(err); }
}

export async function revokeLink(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { linkId } = req.params;
    const teacherId = req.teacherProfileId!;
    // Verify the link involves a student in teacher's workspace
    const link = await prisma.parentStudentLink.findFirst({
      where: { id: linkId, student: { teacherId } },
    });
    if (!link) throw new AppError('Link not found', 'NOT_FOUND', 404);
    await prisma.parentStudentLink.update({
      where: { id: linkId },
      data: { isActive: false, revokedAt: new Date() },
    });
    await writeAuditLog({ userId: req.user!.id, teacherId, action: 'parent.link.revoke', resourceId: linkId });
    sendSuccess(res, null, { message: 'Parent link revoked' });
  } catch (err) { next(err); }
}

export async function updateLinkPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { linkId } = req.params;
    const teacherId = req.teacherProfileId!;
    const data = req.body as UpdateLinkPermissionsInput;
    const link = await prisma.parentStudentLink.findFirst({
      where: { id: linkId, student: { teacherId } },
    });
    if (!link) throw new AppError('Link not found', 'NOT_FOUND', 404);
    const updated = await prisma.parentStudentLink.update({ where: { id: linkId }, data });
    sendSuccess(res, updated);
  } catch (err) { next(err); }
}

export async function listStudentParents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId } = req.params;
    const teacherId = req.teacherProfileId!;
    const student = await prisma.student.findFirst({ where: { id: studentId, teacherId } });
    if (!student) throw new AppError('Student not found', 'NOT_FOUND', 404);
    const links = await prisma.parentStudentLink.findMany({
      where: { studentId },
      include: {
        parent: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
      },
    });
    sendSuccess(res, links);
  } catch (err) { next(err); }
}

// ============================================================
// PARENT ENDPOINTS - accept invitation and view data
// ============================================================

export async function acceptInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = req.body as AcceptInvitationInput;
    const parentProfileId = req.parentProfileId;
    if (!parentProfileId) {
      sendError(res, 'FORBIDDEN', 'Only parent accounts can accept invitations', 403);
      return;
    }
    const invitation = await prisma.parentInvitation.findUnique({ where: { token } });
    if (!invitation || invitation.status !== 'PENDING' || invitation.expiresAt < new Date()) {
      sendError(res, 'INVITATION_INVALID', 'Invitation is invalid, expired, or already used', 400);
      return;
    }
    const [link] = await prisma.$transaction([
      prisma.parentStudentLink.upsert({
        where: { parentId_studentId: { parentId: parentProfileId, studentId: invitation.studentId } },
        create: {
          parentId: parentProfileId,
          studentId: invitation.studentId,
          canViewAttendance: invitation.canViewAttendance,
          canViewGrades: invitation.canViewGrades,
          canViewPayments: invitation.canViewPayments,
          canViewAssessments: invitation.canViewAssessments,
          canViewFiles: invitation.canViewFiles,
          isActive: true,
        },
        update: { isActive: true },
      }),
      prisma.parentInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      }),
    ]);
    await writeAuditLog({ userId: req.user!.id, action: 'parent.invitation.accept', resourceId: invitation.id });
    sendSuccess(res, link, { message: 'Invitation accepted successfully' });
  } catch (err) { next(err); }
}

export async function getMyStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parentProfileId = req.parentProfileId;
    if (!parentProfileId) {
      sendError(res, 'FORBIDDEN', 'Parent access required', 403);
      return;
    }
    const links = await prisma.parentStudentLink.findMany({
      where: { parentId: parentProfileId, isActive: true },
      include: {
        student: {
          select: {
            id: true, firstName: true, lastName: true,
            teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
        },
      },
    });
    sendSuccess(res, links);
  } catch (err) { next(err); }
}

export async function getStudentDataForParent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId } = req.params;
    const parentProfileId = req.parentProfileId;
    if (!parentProfileId) {
      sendError(res, 'FORBIDDEN', 'Parent access required', 403);
      return;
    }
    // Verify this parent has active link to this student
    const link = await prisma.parentStudentLink.findFirst({
      where: { parentId: parentProfileId, studentId, isActive: true },
    });
    if (!link) {
      sendError(res, 'FORBIDDEN', 'You do not have access to this student', 403);
      return;
    }
    
    // Build response based on permissions
    const data: Record<string, unknown> = { studentId };
    
    if (link.canViewAttendance) {
      data.attendance = await prisma.attendanceRecord.findMany({
        where: { studentId },
        orderBy: { markedAt: 'desc' },
        take: 30,
        include: { session: { select: { sessionDate: true, class: { select: { name: true } } } } },
      });
    }
    
    if (link.canViewGrades) {
      data.grades = await prisma.examGrade.findMany({
        where: { studentId },
        include: { exam: { select: { title: true, totalMarks: true, examDate: true } } },
      });
    }
    
    if (link.canViewPayments) {
      data.payments = await prisma.payment.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, amount: true, currency: true, status: true, dueDate: true, description: true },
      });
    }
    
    if (link.canViewAssessments) {
      data.assessments = await prisma.assessment.findMany({
        where: { studentId },
        orderBy: { assessedAt: 'desc' },
      });
    }
    
    if (link.canViewFiles) {
      data.files = await prisma.teacherFile.findMany({
        where: { teacherId: (await prisma.student.findUnique({ where: { id: studentId }, select: { teacherId: true } }))!.teacherId, isParentVisible: true },
      });
    }
    
    sendSuccess(res, data);
  } catch (err) { next(err); }
}
