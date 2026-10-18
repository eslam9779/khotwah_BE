# ClassPilot Backend — Implementation Status

## ✅ Completed

### Infrastructure
- [x] Node.js + Express + TypeScript project setup
- [x] `tsconfig.json` — TS6 compatible, strict mode
- [x] `package.json` — all scripts (dev, build, test, db:*)
- [x] `.env.example` + `.env` (needs your values)
- [x] `.gitignore`

### Configuration
- [x] `src/config/env.ts` — Zod-validated environment variables
- [x] `src/config/prisma.ts` — Singleton Prisma client
- [x] `src/config/swagger.ts` — OpenAPI 3.0 spec

### Prisma Schema (`prisma/schema.prisma`)
- [x] `User` + role-specific profiles (TeacherProfile, StudentProfile, ParentProfile)
- [x] `Student` — tied to TeacherProfile (workspace isolation)
- [x] `Class` + `ClassEnrollment`
- [x] `AttendanceSession` + `AttendanceRecord` + `QRSession`
- [x] `Payment` + `PaymentExemption`
- [x] `Exam` + `ExamGrade`
- [x] `Assessment`
- [x] `TeacherFile`
- [x] `Notification` + `StudentNotification`
- [x] `ParentInvitation` + `ParentStudentLink` (per-student permissions)
- [x] `RefreshToken` (JTI-based rotation)
- [x] `AuditLog`

### Security
- [x] JWT access (15m) + refresh (7d) with rotation
- [x] Bcrypt password hashing
- [x] Workspace isolation — every query filters by `teacherId`
- [x] `authenticate` middleware
- [x] `requireRole` middleware
- [x] `requireTeacherOwnership` middleware
- [x] QR toggle enforced on backend (generate + scan)
- [x] Rate limiting (global + auth-specific)
- [x] Helmet security headers
- [x] Audit logging (never breaks requests)
- [x] Input validation with Zod on all endpoints
- [x] Error handling — no internal details leaked

### API Modules
- [x] Auth — register, login, refresh, logout, getMe
- [x] Teacher Workspace — get, update, QR toggle
- [x] Students — CRUD with pagination + search
- [x] Classes — CRUD + enrollment management
- [x] Attendance — sessions, mark, QR generate + scan
- [x] Payments — CRUD + full/partial exemptions
- [x] Exams — CRUD + single/bulk grading
- [x] Assessments — CRUD
- [x] Files — add + list + delete
- [x] Notifications — send to all/class/student
- [x] Parents — teacher invitations, parent accept, per-student permissions

### Tooling
- [x] Swagger UI at `/api/docs`
- [x] Health check at `/health`
- [x] `prisma/seed.ts` — safe dev data
- [x] `ClassPilot_API.postman_collection.json` — full Postman collection
- [x] TypeScript: **0 errors** (`npx tsc --noEmit` passes)

---

## ⏳ Pending (requires your action)

### 1. Install PostgreSQL
Without this, the database can't run. See step-by-step in the guide below.

### 2. Set `.env` values
Fill in `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `QR_SECRET`.

### 3. Run migrations
```
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 4. Start the server
```
npm run dev
```

---

## 📋 What's left (after DB setup)
- [ ] Vitest tests (workspace isolation, QR toggle, payment exemptions, parent permissions)
- [ ] TypeScript compilation to JS (`npm run build`)
- [ ] Final server start test

---

## 🔌 API Endpoints Reference

| Module | Method | Path | Auth |
|--------|--------|------|------|
| Health | GET | `/health` | None |
| Auth | POST | `/api/v1/auth/register` | None |
| Auth | POST | `/api/v1/auth/login` | None |
| Auth | POST | `/api/v1/auth/refresh` | None |
| Auth | GET | `/api/v1/auth/me` | JWT |
| Auth | POST | `/api/v1/auth/logout` | JWT |
| Teacher | GET | `/api/v1/teacher/workspace` | JWT+TEACHER |
| Teacher | PATCH | `/api/v1/teacher/workspace` | JWT+TEACHER |
| Teacher | PATCH | `/api/v1/teacher/workspace/qr` | JWT+TEACHER |
| Students | GET | `/api/v1/students` | JWT+TEACHER |
| Students | POST | `/api/v1/students` | JWT+TEACHER |
| Students | GET | `/api/v1/students/:id` | JWT+TEACHER |
| Students | PATCH | `/api/v1/students/:id` | JWT+TEACHER |
| Students | DELETE | `/api/v1/students/:id` | JWT+TEACHER |
| Classes | GET/POST | `/api/v1/classes` | JWT+TEACHER |
| Classes | GET/PATCH/DELETE | `/api/v1/classes/:id` | JWT+TEACHER |
| Classes | POST | `/api/v1/classes/:id/enroll` | JWT+TEACHER |
| Classes | DELETE | `/api/v1/classes/:id/students/:sid` | JWT+TEACHER |
| Attendance | GET/POST | `/api/v1/attendance/sessions` | JWT+TEACHER |
| Attendance | GET | `/api/v1/attendance/sessions/:id/records` | JWT+TEACHER |
| Attendance | POST | `/api/v1/attendance/sessions/:id/mark` | JWT+TEACHER |
| Attendance | POST | `/api/v1/attendance/qr/generate` | JWT+TEACHER |
| Attendance | POST | `/api/v1/attendance/qr/scan` | JWT (any) |
| Payments | GET/POST | `/api/v1/payments` | JWT+TEACHER |
| Payments | PATCH | `/api/v1/payments/:id` | JWT+TEACHER |
| Payments | POST | `/api/v1/payments/:id/exemption` | JWT+TEACHER |
| Exams | GET/POST | `/api/v1/exams` | JWT+TEACHER |
| Exams | GET/PATCH | `/api/v1/exams/:id` | JWT+TEACHER |
| Exams | POST | `/api/v1/exams/:id/grades` | JWT+TEACHER |
| Exams | POST | `/api/v1/exams/:id/grades/bulk` | JWT+TEACHER |
| Assessments | GET/POST | `/api/v1/assessments` | JWT+TEACHER |
| Assessments | DELETE | `/api/v1/assessments/:id` | JWT+TEACHER |
| Files | GET/POST | `/api/v1/files` | JWT+TEACHER |
| Files | DELETE | `/api/v1/files/:id` | JWT+TEACHER |
| Notifications | GET/POST | `/api/v1/notifications` | JWT+TEACHER |
| Parents (teacher) | POST | `/api/v1/parents/teacher/invitations` | JWT+TEACHER |
| Parents (teacher) | GET | `/api/v1/parents/teacher/students/:id/links` | JWT+TEACHER |
| Parents (teacher) | DELETE | `/api/v1/parents/teacher/links/:id` | JWT+TEACHER |
| Parents (teacher) | PATCH | `/api/v1/parents/teacher/links/:id/permissions` | JWT+TEACHER |
| Parents (parent) | POST | `/api/v1/parents/parent/invitations/accept` | JWT+PARENT |
| Parents (parent) | GET | `/api/v1/parents/parent/my-students` | JWT+PARENT |
| Swagger Docs | GET | `/api/docs` | None |
