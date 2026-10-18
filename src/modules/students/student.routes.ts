import { Router } from 'express';
import { authenticate, requireRole, requireTeacherOwnership } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  listStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
} from './student.controller';
import { createStudentSchema, updateStudentSchema, paginationSchema } from './student.schema';

const router = Router();

// All student routes require authentication + teacher role
router.use(authenticate, requireRole('TEACHER'), requireTeacherOwnership);

/**
 * @openapi
 * /students:
 *   get:
 *     tags: [Students]
 *     summary: قائمة الطلاب في الـWorkspace
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 */
router.get('/', validate(paginationSchema, 'query'), listStudents);

/**
 * @openapi
 * /students/{studentId}:
 *   get:
 *     tags: [Students]
 *     summary: تفاصيل طالب
 */
router.get('/:studentId', getStudent);

/**
 * @openapi
 * /students:
 *   post:
 *     tags: [Students]
 *     summary: إضافة طالب جديد
 */
router.post('/', validate(createStudentSchema), createStudent);

/**
 * @openapi
 * /students/{studentId}:
 *   patch:
 *     tags: [Students]
 *     summary: تعديل بيانات طالب
 */
router.patch('/:studentId', validate(updateStudentSchema), updateStudent);

/**
 * @openapi
 * /students/{studentId}:
 *   delete:
 *     tags: [Students]
 *     summary: حذف (تعطيل) طالب
 */
router.delete('/:studentId', deleteStudent);

export default router;
