import { Router } from 'express';
import { authenticate, requireRole, requireTeacherOwnership } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createNotificationSchema } from './notification.schema';
import { listNotifications, createNotification } from './notification.controller';

const router = Router();
router.use(authenticate, requireRole('TEACHER'), requireTeacherOwnership);

router.get('/', listNotifications);
router.post('/', validate(createNotificationSchema), createNotification);

export default router;
