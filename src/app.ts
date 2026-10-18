import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { config } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

// Route modules
import authRouter from './modules/auth/auth.routes';
import teacherRouter from './modules/teachers/teacher.routes';
import studentRouter from './modules/students/student.routes';
import parentRouter from './modules/parents/parent.routes';
import classRouter from './modules/classes/class.routes';
import attendanceRouter from './modules/attendance/attendance.routes';
import paymentRouter from './modules/payments/payment.routes';
import examRouter from './modules/exams/exam.routes';
import assessmentRouter from './modules/assessments/assessment.routes';
import fileRouter from './modules/files/file.routes';
import notificationRouter from './modules/notifications/notification.routes';
import { swaggerSpec } from './config/swagger';

const app = express();

// ============================================================
// Security Middleware
// ============================================================
app.use(helmet());

// CORS
const allowedOrigins = config.CORS_ORIGINS.split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));

// ============================================================
// General Rate Limiting
// ============================================================
const globalLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' },
  },
});
app.use(globalLimiter);

// ============================================================
// Parsing & Logging
// ============================================================
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (config.NODE_ENV !== 'test') {
  app.use(morgan(config.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// ============================================================
// Health Check
// ============================================================
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ============================================================
// API Documentation
// ============================================================
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ClassPilot API Docs',
}));

// ============================================================
// API Routes
// ============================================================
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRouter);
app.use(`${API_PREFIX}/teacher`, teacherRouter);
app.use(`${API_PREFIX}/students`, studentRouter);
app.use(`${API_PREFIX}/parents`, parentRouter);
app.use(`${API_PREFIX}/classes`, classRouter);
app.use(`${API_PREFIX}/attendance`, attendanceRouter);
app.use(`${API_PREFIX}/payments`, paymentRouter);
app.use(`${API_PREFIX}/exams`, examRouter);
app.use(`${API_PREFIX}/assessments`, assessmentRouter);
app.use(`${API_PREFIX}/files`, fileRouter);
app.use(`${API_PREFIX}/notifications`, notificationRouter);

// ============================================================
// Error Handlers
// ============================================================
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
