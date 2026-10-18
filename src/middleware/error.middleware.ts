import { Request, Response, NextFunction } from 'express';
import { AppError, sendError } from '../utils/response';
import { isDev } from '../config/env';

/**
 * Global error handler — catches all unhandled errors from routes/middleware.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Known application errors
  if (err instanceof AppError) {
    sendError(res, err.code, err.message, err.statusCode, err.details);
    return;
  }

  // Prisma "record not found" errors
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as { code?: string; meta?: { cause?: string } };
    if (prismaErr.code === 'P2025') {
      sendError(res, 'NOT_FOUND', 'Record not found', 404);
      return;
    }
    if (prismaErr.code === 'P2002') {
      sendError(res, 'CONFLICT', 'A record with this value already exists', 409);
      return;
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    sendError(res, 'TOKEN_INVALID', 'Invalid or expired token', 401);
    return;
  }

  // Unknown errors — log internally, return generic response
  console.error('[ErrorHandler]', {
    message: err.message,
    stack: isDev ? err.stack : undefined,
    url: req.url,
    method: req.method,
  });

  sendError(
    res,
    'INTERNAL_ERROR',
    'An unexpected error occurred',
    500,
    isDev ? { stack: err.stack } : undefined
  );
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`, 404);
}
