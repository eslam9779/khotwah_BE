import prisma from '../config/prisma';

interface AuditLogParams {
  userId?: string | string[];
  teacherId?: string | string[];
  action: string;
  resource?: string;
  resourceId?: string | string[];
  metadata?: Record<string, unknown>;
  ipAddress?: string | string[];
  userAgent?: string;
}

// Normalize string | string[] to string
function toStr(val: string | string[] | undefined): string | undefined {
  if (Array.isArray(val)) return val[0];
  return val;
}

/**
 * Write an audit log entry.
 * Never throws — failures are logged to console but don't break the request.
 */
export async function writeAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: toStr(params.userId),
        teacherId: toStr(params.teacherId),
        action: params.action,
        resource: params.resource,
        resourceId: toStr(params.resourceId),
        metadata: params.metadata,
        ipAddress: toStr(params.ipAddress),
        userAgent: params.userAgent,
      },
    });
  } catch (err) {
    // Audit log failure should not crash the app
    console.error('[AuditLog] Failed to write audit log:', err);
  }
}
