import { Router } from 'express';
import { authenticate, requireRole, requireTeacherOwnership } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createAssessmentSchema } from './assessment.schema';
import { listAssessments, createAssessment, deleteAssessment } from './assessment.controller';

const router = Router();
router.use(authenticate, requireRole('TEACHER'), requireTeacherOwnership);

router.get('/', listAssessments);
router.post('/', validate(createAssessmentSchema), createAssessment);
router.delete('/:assessmentId', deleteAssessment);

export default router;
