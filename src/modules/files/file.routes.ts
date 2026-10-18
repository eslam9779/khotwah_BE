import { Router } from 'express';
import { authenticate, requireRole, requireTeacherOwnership } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createFileSchema } from './file.schema';
import { listFiles, createFile, deleteFile } from './file.controller';

const router = Router();
router.use(authenticate, requireRole('TEACHER'), requireTeacherOwnership);

router.get('/', listFiles);
router.post('/', validate(createFileSchema), createFile);
router.delete('/:fileId', deleteFile);

export default router;
