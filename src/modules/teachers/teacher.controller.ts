import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/prisma';
import { sendSuccess, AppError } from '../../utils/response';
import { writeAuditLog } from '../../utils/audit';

/**
 * GET /api/v1/teacher/workspace
 * Get current teacher's workspace/profile info
 */
export async function getWorkspace(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teacherId = req.teacherProfileId!;
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, createdAt: true } },
        _count: {
          select: {
            students: true,
            classes: true,
          },
        },
      },
    });
    if (!teacher) throw new AppError('Teacher profile not found', 'NOT_FOUND', 404);
    sendSuccess(res, teacher);
  } catch (err) { next(err); }
}

/**
 * PATCH /api/v1/teacher/workspace
 * Update teacher workspace settings
 */
export async function updateWorkspace(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teacherId = req.teacherProfileId!;
    const { bio, phone, subject } = req.body as { bio?: string; phone?: string; subject?: string };
    const updated = await prisma.teacherProfile.update({
      where: { id: teacherId },
      data: { bio, phone, subject },
    });
    await writeAuditLog({ userId: req.user!.id, teacherId, action: 'teacher.workspace.update', resource: 'TeacherProfile', resourceId: teacherId });
    sendSuccess(res, updated);
  } catch (err) { next(err); }
}

/**
 * PATCH /api/v1/teacher/workspace/qr
 * Toggle QR attendance feature on/off
 */
export async function toggleQR(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teacherId = req.teacherProfileId!;
    const { enabled } = req.body as { enabled: boolean };
    if (typeof enabled !== 'boolean') throw new AppError('Field "enabled" must be a boolean', 'VALIDATION_ERROR', 400);
    const updated = await prisma.teacherProfile.update({
      where: { id: teacherId },
      data: { qrEnabled: enabled },
      select: { id: true, qrEnabled: true },
    });
    await writeAuditLog({
      userId: req.user!.id,
      teacherId,
      action: enabled ? 'teacher.qr.enabled' : 'teacher.qr.disabled',
      resource: 'TeacherProfile',
      resourceId: teacherId,
    });
    sendSuccess(res, updated, { message: `QR attendance ${enabled ? 'enabled' : 'disabled'}` });
  } catch (err) { next(err); }
}
