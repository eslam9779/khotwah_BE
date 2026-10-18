import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/prisma';
import { sendSuccess, sendError, AppError } from '../../utils/response';
import { writeAuditLog } from '../../utils/audit';
import { signQRPayload, verifyQRPayload, addSeconds } from '../../utils/auth';
import { config } from '../../config/env';
import { CreateSessionInput, MarkAttendanceInput, QRAttendanceInput } from './attendance.schema';
import { randomUUID } from 'crypto';

/**
 * GET /api/v1/attendance/sessions
 */
export async function listSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teacherId = req.teacherProfileId!;
    const classId = Array.isArray(req.query.classId) ? req.query.classId[0] : req.query.classId as string | undefined;
    const sessions = await prisma.attendanceSession.findMany({
      where: { teacherId, ...(classId ? { classId } : {}) },
      orderBy: { sessionDate: 'desc' },
      take: 50,
      include: {
        class: { select: { id: true, name: true } },
        _count: { select: { records: true } },
      },
    });
    sendSuccess(res, sessions);
  } catch (err) { next(err); }
}

/**
 * POST /api/v1/attendance/sessions
 */
export async function createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = req.body as CreateSessionInput;
    const teacherId = req.teacherProfileId!;
    // Verify class belongs to teacher
    const cls = await prisma.class.findFirst({ where: { id: data.classId, teacherId } });
    if (!cls) throw new AppError('Class not found', 'NOT_FOUND', 404);
    const session = await prisma.attendanceSession.create({
      data: { ...data, teacherId, sessionDate: new Date(data.sessionDate) },
    });
    sendSuccess(res, session, { statusCode: 201 });
  } catch (err) { next(err); }
}

/**
 * POST /api/v1/attendance/sessions/:sessionId/mark
 */
export async function markAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sessionId } = req.params;
    const teacherId = req.teacherProfileId!;
    const { records } = req.body as MarkAttendanceInput;
    // Verify session belongs to teacher
    const session = await prisma.attendanceSession.findFirst({
      where: { id: sessionId, teacherId },
    });
    if (!session) throw new AppError('Session not found', 'NOT_FOUND', 404);
    // Upsert all records
    const results = await prisma.$transaction(
      records.map(r => prisma.attendanceRecord.upsert({
        where: { sessionId_studentId: { sessionId, studentId: r.studentId } },
        create: { sessionId, studentId: r.studentId, status: r.status, notes: r.notes, markedById: teacherId },
        update: { status: r.status, notes: r.notes, markedById: teacherId },
      }))
    );
    await writeAuditLog({ userId: req.user!.id, teacherId, action: 'attendance.mark', resourceId: sessionId });
    sendSuccess(res, results);
  } catch (err) { next(err); }
}

/**
 * GET /api/v1/attendance/sessions/:sessionId/records
 */
export async function getSessionRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sessionId } = req.params;
    const teacherId = req.teacherProfileId!;
    const session = await prisma.attendanceSession.findFirst({ where: { id: sessionId, teacherId } });
    if (!session) throw new AppError('Session not found', 'NOT_FOUND', 404);
    const records = await prisma.attendanceRecord.findMany({
      where: { sessionId },
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
    });
    sendSuccess(res, records);
  } catch (err) { next(err); }
}

/**
 * POST /api/v1/attendance/qr/generate
 * Generate a QR code token for a session
 */
export async function generateQRCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teacherId = req.teacherProfileId!;
    const { sessionId } = req.body as { sessionId: string };
    // Check QR is enabled for this teacher
    const teacher = await prisma.teacherProfile.findUnique({ where: { id: teacherId } });
    if (!teacher?.qrEnabled) {
      sendError(res, 'QR_DISABLED', 'QR attendance is not enabled for your account', 403);
      return;
    }
    // Verify session
    const session = await prisma.attendanceSession.findFirst({ where: { id: sessionId, teacherId } });
    if (!session) throw new AppError('Session not found', 'NOT_FOUND', 404);
    
    const expiresAt = addSeconds(new Date(), config.QR_EXPIRY_SECONDS);
    const payload = signQRPayload({ sessionId, teacherId, exp: expiresAt.getTime() });
    
    const qrSession = await prisma.qRSession.create({
      data: {
        teacherId,
        token: randomUUID(),
        payload,
        expiresAt,
      },
    });
    
    sendSuccess(res, { token: qrSession.token, payload, expiresAt, sessionId });
  } catch (err) { next(err); }
}

/**
 * POST /api/v1/attendance/qr/scan
 * Student scans QR and marks attendance
 */
export async function scanQRCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { qrToken, studentId } = req.body as QRAttendanceInput;
    // Find QR session
    const qrSession = await prisma.qRSession.findUnique({ where: { token: qrToken } });
    if (!qrSession || qrSession.isUsed || qrSession.expiresAt < new Date()) {
      sendError(res, 'QR_INVALID', 'QR code is invalid, expired, or already used', 400);
      return;
    }
    // Verify QR payload signature
    let decoded: Record<string, unknown>;
    try {
      decoded = verifyQRPayload(qrSession.payload);
    } catch {
      sendError(res, 'QR_TAMPERED', 'QR code signature is invalid', 400);
      return;
    }
    // Check QR is enabled for this teacher
    const teacher = await prisma.teacherProfile.findUnique({ where: { id: decoded.teacherId as string } });
    if (!teacher?.qrEnabled) {
      sendError(res, 'QR_DISABLED', 'QR attendance is not enabled by this teacher', 403);
      return;
    }
    const sessionId = decoded.sessionId as string;
    // Verify student belongs to teacher's workspace
    const student = await prisma.student.findFirst({
      where: { id: studentId, teacherId: decoded.teacherId as string },
    });
    if (!student) {
      sendError(res, 'FORBIDDEN', 'Student not found in this teacher workspace', 403);
      return;
    }
    // Mark attendance + mark QR as used in transaction
    const [record] = await prisma.$transaction([
      prisma.attendanceRecord.upsert({
        where: { sessionId_studentId: { sessionId, studentId } },
        create: { sessionId, studentId, status: 'PRESENT', viaQr: true },
        update: { status: 'PRESENT', viaQr: true },
      }),
      prisma.qRSession.update({
        where: { id: qrSession.id },
        data: { isUsed: true, usedAt: new Date() },
      }),
    ]);
    await writeAuditLog({ action: 'attendance.qr_scan', resource: 'QRSession', resourceId: qrSession.id, metadata: { studentId } });
    sendSuccess(res, record, { message: 'Attendance marked via QR' });
  } catch (err) { next(err); }
}
