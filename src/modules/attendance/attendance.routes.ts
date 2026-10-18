import { Router } from 'express';
import { authenticate, requireRole, requireTeacherOwnership } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createSessionSchema, markAttendanceSchema, qrAttendanceSchema } from './attendance.schema';
import { listSessions, createSession, markAttendance, getSessionRecords, generateQRCode, scanQRCode } from './attendance.controller';
import { z } from 'zod';

const router = Router();

// Teacher routes
const teacherRouter = Router();
teacherRouter.use(authenticate, requireRole('TEACHER'), requireTeacherOwnership);
teacherRouter.get('/sessions', listSessions);
teacherRouter.post('/sessions', validate(createSessionSchema), createSession);
teacherRouter.get('/sessions/:sessionId/records', getSessionRecords);
teacherRouter.post('/sessions/:sessionId/mark', validate(markAttendanceSchema), markAttendance);
teacherRouter.post('/qr/generate', validate(z.object({ sessionId: z.string().uuid() })), generateQRCode);

// QR scan route - can be accessed by any authenticated user (student)
router.use('/qr/scan', authenticate);
router.post('/qr/scan', validate(qrAttendanceSchema), scanQRCode);

router.use('/', teacherRouter);

export default router;
