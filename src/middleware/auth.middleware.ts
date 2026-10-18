import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '../utils/auth';
import { sendError } from '../utils/response';
import prisma from '../config/prisma';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload & { id: string };
      teacherProfileId?: string;
      parentProfileId?: string;
    }
  }
}

/**
 * Verifies JWT access token and attaches user to req.user
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = { ...payload, id: payload.sub };

    // Cache profile IDs on the request object for convenience
    if (payload.teacherId) {
      req.teacherProfileId = payload.teacherId;
    }
    if (payload.parentId) {
      req.parentProfileId = payload.parentId;
    }

    next();
  } catch {
    sendError(res, 'TOKEN_INVALID', 'Invalid or expired token', 401);
  }
}

/**
 * Require a specific role or array of roles
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }
    if (!roles.includes(req.user.role)) {
      sendError(res, 'FORBIDDEN', 'Insufficient permissions', 403);
      return;
    }
    next();
  };
}

/**
 * Ensures teacher can only access their own workspace resources.
 * Attaches teacherProfile to req if not already present.
 */
export async function requireTeacherOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user || req.user.role !== 'TEACHER') {
    sendError(res, 'FORBIDDEN', 'Teacher access required', 403);
    return;
  }

  if (!req.teacherProfileId) {
    // Load from DB if not in token (shouldn't happen with fresh tokens)
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId: req.user.id },
    });
    if (!profile) {
      sendError(res, 'PROFILE_NOT_FOUND', 'Teacher profile not found', 404);
      return;
    }
    req.teacherProfileId = profile.id;
  }

  next();
}

/**
 * Verifies the student with :studentId param belongs to the current teacher's workspace.
 */
export async function verifyStudentOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { studentId } = req.params;
  if (!studentId || !req.teacherProfileId) {
    sendError(res, 'BAD_REQUEST', 'Missing required parameters', 400);
    return;
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, teacherId: req.teacherProfileId },
    select: { id: true },
  });

  if (!student) {
    sendError(res, 'NOT_FOUND', 'Student not found in your workspace', 404);
    return;
  }

  next();
}
