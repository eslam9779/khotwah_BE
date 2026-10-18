import { Router } from 'express';
import { authenticate, requireRole, requireTeacherOwnership } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createInvitationSchema, acceptInvitationSchema, updateLinkPermissionsSchema
} from './parent.schema';
import {
  createInvitation, revokeLink, updateLinkPermissions, listStudentParents,
  acceptInvitation, getMyStudents, getStudentDataForParent,
} from './parent.controller';

const router = Router();

// Teacher routes
const teacherRouter = Router();
teacherRouter.use(authenticate, requireRole('TEACHER'), requireTeacherOwnership);
teacherRouter.post('/invitations', validate(createInvitationSchema), createInvitation);
teacherRouter.delete('/links/:linkId', revokeLink);
teacherRouter.patch('/links/:linkId/permissions', validate(updateLinkPermissionsSchema), updateLinkPermissions);
teacherRouter.get('/students/:studentId/parents', listStudentParents);

// Parent routes
const parentRouter = Router();
parentRouter.use(authenticate, requireRole('PARENT'));
parentRouter.post('/invitations/accept', validate(acceptInvitationSchema), acceptInvitation);
parentRouter.get('/my-students', getMyStudents);
parentRouter.get('/students/:studentId/data', getStudentDataForParent);

router.use('/teacher', teacherRouter);
router.use('/parent', parentRouter);

export default router;
