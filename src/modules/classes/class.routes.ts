import { Router } from 'express';
import { authenticate, requireRole, requireTeacherOwnership } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createClassSchema, updateClassSchema, enrollStudentSchema } from './class.schema';
import { listClasses, getClass, createClass, updateClass, deleteClass, enrollStudent, removeStudentFromClass } from './class.controller';

const router = Router();
router.use(authenticate, requireRole('TEACHER'), requireTeacherOwnership);

router.get('/', listClasses);
router.get('/:classId', getClass);
router.post('/', validate(createClassSchema), createClass);
router.patch('/:classId', validate(updateClassSchema), updateClass);
router.delete('/:classId', deleteClass);
router.post('/:classId/enroll', validate(enrollStudentSchema), enrollStudent);
router.delete('/:classId/students/:studentId', removeStudentFromClass);

export default router;
