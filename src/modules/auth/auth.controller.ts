import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import prisma from '../../config/prisma';
import {
  hashPassword,
  comparePassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  addDays,
  parseDurationToMs,
} from '../../utils/auth';
import { sendSuccess, sendError, AppError } from '../../utils/response';
import { writeAuditLog } from '../../utils/audit';
import { config } from '../../config/env';
import { RegisterInput, LoginInput, RefreshTokenInput } from './auth.schema';
import rateLimit from 'express-rate-limit';

// Stricter rate limit for auth endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only count failures
  message: {
    success: false,
    error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many login attempts. Try again in 15 minutes.' },
  },
});

/**
 * POST /api/v1/auth/register
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, firstName, lastName, role, phone } = req.body as RegisterInput;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      sendError(res, 'EMAIL_IN_USE', 'Email address is already registered', 409);
      return;
    }

    const passwordHash = await hashPassword(password);

    // Create user + profile in one transaction
    const user = await prisma.$transaction(async (tx: typeof prisma) => {
      const newUser = await tx.user.create({
        data: {
          email,
          phone,
          passwordHash,
          role,
          firstName,
          lastName,
        },
      });

      // Create role-specific profile
      if (role === 'TEACHER') {
        await tx.teacherProfile.create({ data: { userId: newUser.id } });
      } else if (role === 'STUDENT') {
        await tx.studentProfile.create({ data: { userId: newUser.id } });
      } else if (role === 'PARENT') {
        await tx.parentProfile.create({ data: { userId: newUser.id } });
      }

      return newUser;
    });

    await writeAuditLog({
      userId: user.id,
      action: 'auth.register',
      resource: 'User',
      resourceId: user.id,
      ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
    });

    sendSuccess(res, { id: user.id, email: user.email, role: user.role }, {
      statusCode: 201,
      message: 'Account created successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/login
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as LoginInput;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        teacherProfile: { select: { id: true } },
        parentProfile: { select: { id: true } },
      },
    });

    // Use constant-time check to avoid timing attacks
    const isValid = user ? await comparePassword(password, user.passwordHash) : false;

    if (!user || !isValid) {
      await writeAuditLog({
        action: 'auth.login.failed',
        metadata: { email },
        ipAddress: req.ip,
      });
      sendError(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
      return;
    }

    if (!user.isActive) {
      sendError(res, 'ACCOUNT_DISABLED', 'Your account has been disabled', 403);
      return;
    }

    // Build JWT payload
    const payload = {
      sub: user.id,
      role: user.role,
      teacherId: user.teacherProfile?.id,
      parentId: user.parentProfile?.id,
    };

    const accessToken = signAccessToken(payload);
    const jti = randomUUID();
    const refreshToken = signRefreshToken({ sub: user.id, jti });
    const refreshExpiresAt = addDays(new Date(), 7);

    // Store refresh token
    await prisma.$transaction([
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: jti, // store jti, not the full token
          expiresAt: refreshExpiresAt,
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
    ]);

    await writeAuditLog({
      userId: user.id,
      action: 'auth.login',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    sendSuccess(res, {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/refresh
 */
export async function refreshAccessToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken } = req.body as RefreshTokenInput;

    let payload: { sub: string; jti: string };
    try {
      payload = verifyRefreshToken(refreshToken) as { sub: string; jti: string };
    } catch {
      sendError(res, 'TOKEN_INVALID', 'Invalid or expired refresh token', 401);
      return;
    }

    // Check if JTI exists and is not revoked
    const stored = await prisma.refreshToken.findFirst({
      where: { token: payload.jti, userId: payload.sub, isRevoked: false },
      include: {
        user: {
          include: {
            teacherProfile: { select: { id: true } },
            parentProfile: { select: { id: true } },
          },
        },
      },
    });

    if (!stored || stored.expiresAt < new Date()) {
      sendError(res, 'TOKEN_REVOKED', 'Refresh token is expired or revoked', 401);
      return;
    }

    if (!stored.user.isActive) {
      sendError(res, 'ACCOUNT_DISABLED', 'Account is disabled', 403);
      return;
    }

    // Rotate: revoke old, issue new
    const newJti = randomUUID();
    const newRefreshToken = signRefreshToken({ sub: stored.userId, jti: newJti });
    const newAccessToken = signAccessToken({
      sub: stored.userId,
      role: stored.user.role,
      teacherId: stored.user.teacherProfile?.id,
      parentId: stored.user.parentProfile?.id,
    });

    await prisma.$transaction([
      prisma.refreshToken.update({ where: { id: stored.id }, data: { isRevoked: true } }),
      prisma.refreshToken.create({
        data: {
          userId: stored.userId,
          token: newJti,
          expiresAt: addDays(new Date(), 7),
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
        },
      }),
    ]);

    sendSuccess(res, { accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/logout
 */
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body as RefreshTokenInput;

    try {
      const payload = verifyRefreshToken(refreshToken) as { sub: string; jti: string };
      await prisma.refreshToken.updateMany({
        where: { token: payload.jti, userId: payload.sub },
        data: { isRevoked: true },
      });
    } catch {
      // Even if token is invalid, we still return success (logout should always succeed)
    }

    sendSuccess(res, null, { message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/auth/me
 * Returns current authenticated user's info
 */
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        isVerified: true,
        createdAt: true,
        teacherProfile: { select: { id: true, subject: true, qrEnabled: true } },
        parentProfile: { select: { id: true } },
      },
    });

    if (!user) {
      throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    }

    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}
