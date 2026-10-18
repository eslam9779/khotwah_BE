import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/prisma';
import { sendSuccess, sendError, AppError } from '../../utils/response';
import { writeAuditLog } from '../../utils/audit';
import { CreateStudentInput, UpdateStudentInput } from './student.schema';

/**
 * GET /api/v1/students
 * List all students in the teacher's workspace
 */
export async function listStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page = 1, limit = 20, search } = req.query as {
      page?: number; limit?: number; search?: string;
    };
    const skip = (Number(page) - 1) * Number(limit);
    const teacherId = req.teacherProfileId!;

    const where = {
      teacherId,
      ...(search ? {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      } : {}),
    };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          isActive: true,
          enrolledAt: true,
          _count: {
            select: {
              classEnrollments: true,
              attendanceRecords: true,
              payments: true,
            },
          },
        },
      }),
      prisma.student.count({ where }),
    ]);

    sendSuccess(res, students, {
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/students/:studentId
 */
export async function getStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId } = req.params;
    const teacherId = req.teacherProfileId!;

    const student = await prisma.student.findFirst({
      where: { id: studentId, teacherId },
      include: {
        classEnrollments: {
          where: { isActive: true },
          include: { class: { select: { id: true, name: true, subject: true } } },
        },
        parentLinks: {
          where: { isActive: true },
          include: {
            parent: {
              include: {
                user: { select: { firstName: true, lastName: true, email: true } },
              },
            },
          },
        },
        _count: {
          select: { attendanceRecords: true, payments: true, examGrades: true },
        },
      },
    });

    if (!student) {
      throw new AppError('Student not found', 'NOT_FOUND', 404);
    }

    sendSuccess(res, student);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/students
 */
export async function createStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = req.body as CreateStudentInput;
    const teacherId = req.teacherProfileId!;

    // Check duplicate email within workspace
    if (data.email) {
      const exists = await prisma.student.findFirst({
        where: { teacherId, email: data.email },
      });
      if (exists) {
        sendError(res, 'DUPLICATE_EMAIL', 'A student with this email already exists in your workspace', 409);
        return;
      }
    }

    const student = await prisma.student.create({
      data: {
        ...data,
        teacherId,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      },
    });

    await writeAuditLog({
      userId: req.user!.id,
      teacherId,
      action: 'student.create',
      resource: 'Student',
      resourceId: student.id,
      ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
    });

    sendSuccess(res, student, { statusCode: 201 });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/students/:studentId
 */
export async function updateStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId } = req.params;
    const teacherId = req.teacherProfileId!;
    const data = req.body as UpdateStudentInput;

    // Verify ownership first
    const existing = await prisma.student.findFirst({
      where: { id: studentId, teacherId },
    });
    if (!existing) {
      throw new AppError('Student not found', 'NOT_FOUND', 404);
    }

    const updated = await prisma.student.update({
      where: { id: studentId },
      data: {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      },
    });

    await writeAuditLog({
      userId: req.user!.id,
      teacherId,
      action: 'student.update',
      resource: 'Student',
      resourceId: studentId,
      ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
    });

    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/students/:studentId
 */
export async function deleteStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId } = req.params;
    const teacherId = req.teacherProfileId!;

    const existing = await prisma.student.findFirst({
      where: { id: studentId, teacherId },
    });
    if (!existing) {
      throw new AppError('Student not found', 'NOT_FOUND', 404);
    }

    // Soft delete — mark as inactive
    await prisma.student.update({
      where: { id: studentId },
      data: { isActive: false },
    });

    await writeAuditLog({
      userId: req.user!.id,
      teacherId,
      action: 'student.delete',
      resource: 'Student',
      resourceId: studentId,
      ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
    });

    sendSuccess(res, null, { message: 'Student deactivated successfully' });
  } catch (err) {
    next(err);
  }
}
