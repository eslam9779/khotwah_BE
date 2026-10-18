import { Router } from 'express';
import { authenticate, requireRole, requireTeacherOwnership } from '../../middleware/auth.middleware';
import { getWorkspace, updateWorkspace, toggleQR } from './teacher.controller';

const router = Router();

// All routes require authentication + TEACHER role + ownership
router.use(authenticate, requireRole('TEACHER'), requireTeacherOwnership);

/**
 * @openapi
 * /teacher/workspace:
 *   get:
 *     summary: Get teacher workspace info
 *     tags: [Teacher]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Teacher workspace data
 */
router.get('/workspace', getWorkspace);

/**
 * @openapi
 * /teacher/workspace:
 *   patch:
 *     summary: Update teacher workspace settings
 *     tags: [Teacher]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/workspace', updateWorkspace);

/**
 * @openapi
 * /teacher/workspace/qr:
 *   patch:
 *     summary: Enable or disable QR attendance
 *     tags: [Teacher]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 */
router.patch('/workspace/qr', toggleQR);

export default router;
