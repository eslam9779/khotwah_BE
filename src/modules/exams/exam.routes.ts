import { Router } from 'express';
import { authenticate, requireRole, requireTeacherOwnership } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createExamSchema, updateExamSchema, gradeStudentSchema, bulkGradeSchema } from './exam.schema';
import { listExams, getExam, createExam, updateExam, gradeStudent, bulkGrade } from './exam.controller';

const router = Router();
router.use(authenticate, requireRole('TEACHER'), requireTeacherOwnership);

router.get('/', listExams);
router.get('/:examId', getExam);
router.post('/', validate(createExamSchema), createExam);
router.patch('/:examId', validate(updateExamSchema), updateExam);
router.post('/:examId/grades', validate(gradeStudentSchema), gradeStudent);
router.post('/:examId/grades/bulk', validate(bulkGradeSchema), bulkGrade);

export default router;
