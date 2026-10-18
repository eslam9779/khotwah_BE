import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import {
  register,
  login,
  refreshAccessToken,
  logout,
  getMe,
  authRateLimiter,
} from './auth.controller';
import { registerSchema, loginSchema, refreshTokenSchema } from './auth.schema';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: إنشاء حساب جديد
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName, role]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               role: { type: string, enum: [TEACHER, STUDENT, PARENT] }
 *     responses:
 *       201: { description: Account created }
 *       409: { description: Email already in use }
 */
router.post('/register', validate(registerSchema), register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: تسجيل الدخول
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful with tokens }
 *       401: { description: Invalid credentials }
 */
router.post('/login', authRateLimiter, validate(loginSchema), login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: تجديد الـAccess Token
 *     security: []
 */
router.post('/refresh', validate(refreshTokenSchema), refreshAccessToken);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: تسجيل الخروج
 */
router.post('/logout', validate(refreshTokenSchema), logout);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: بيانات المستخدم الحالي
 *     security: [{ BearerAuth: [] }]
 */
router.get('/me', authenticate, getMe);

export default router;
