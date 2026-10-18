# ClassPilot Backend

هذا هو الـBackend الخاص بمنصة ClassPilot التعليمية.

## التقنيات المستخدمة
- **Node.js v22** + **TypeScript**
- **Express** — إطار الـHTTP server
- **Prisma ORM** — التعامل مع قاعدة البيانات
- **PostgreSQL** — قاعدة البيانات الرئيسية
- **Zod** — التحقق من المدخلات
- **JWT** — المصادقة والجلسات
- **Swagger/OpenAPI** — توثيق الـAPI
- **Vitest** — الاختبارات

## كيف تشغّل المشروع

### المتطلبات الأساسية
- Node.js v18+
- PostgreSQL v14+

### الخطوات

```bash
# 1. نسخ ملف البيئة
cp .env.example .env

# 2. تعديل .env وإضافة بيانات قاعدة البيانات

# 3. تثبيت التبعيات
npm install

# 4. تشغيل migration
npx prisma migrate dev

# 5. إضافة البيانات التجريبية
npx prisma db seed

# 6. تشغيل المشروع في وضع التطوير
npm run dev

# 7. تشغيل في وضع الإنتاج
npm run build
npm start
```

## هيكل المشروع

```
backend/
├── src/
│   ├── app.ts              # إعداد Express
│   ├── server.ts           # نقطة الدخول
│   ├── config/             # الإعدادات (JWT, env, etc.)
│   ├── middleware/         # Auth, validation, error handling
│   ├── modules/            # كل Feature في module منفصل
│   │   ├── auth/           # تسجيل الدخول والتسجيل
│   │   ├── teachers/       # إدارة المدرسين والـWorkspace
│   │   ├── students/       # الطلاب
│   │   ├── parents/        # أولياء الأمور والدعوات
│   │   ├── classes/        # الفصول الدراسية
│   │   ├── attendance/     # الحضور والغياب + QR
│   │   ├── payments/       # المدفوعات والإعفاءات
│   │   ├── exams/          # الاختبارات والدرجات
│   │   ├── assessments/    # التقييمات
│   │   ├── files/          # الملفات التعليمية
│   │   └── notifications/  # الإشعارات
│   ├── prisma/             # Prisma client instance
│   └── utils/              # أدوات مساعدة عامة
├── prisma/
│   ├── schema.prisma       # تصميم قاعدة البيانات
│   ├── migrations/         # Migrations
│   └── seed.ts             # البيانات التجريبية
├── tests/                  # الاختبارات
└── docs/                   # التوثيق الإضافي
```

## نقاط الـAPI الرئيسية

جميع الـendpoints تبدأ بـ `/api/v1`

### المصادقة
- `POST /api/v1/auth/register` — إنشاء حساب
- `POST /api/v1/auth/login` — تسجيل الدخول
- `POST /api/v1/auth/refresh` — تجديد الـToken
- `POST /api/v1/auth/logout` — تسجيل الخروج

### المدرس
- `GET /api/v1/workspace` — بيانات الـWorkspace
- `GET/POST /api/v1/students` — إدارة الطلاب
- `GET/POST /api/v1/classes` — إدارة الفصول
- `GET/POST /api/v1/attendance` — الحضور
- `GET/POST /api/v1/payments` — المدفوعات
- `GET/POST /api/v1/exams` — الاختبارات
- `GET/POST /api/v1/assessments` — التقييمات
- `GET/POST /api/v1/files` — الملفات

### أولياء الأمور
- `POST /api/v1/parent/invitations/accept` — قبول الدعوة
- `GET /api/v1/parent/students` — طلابي المرتبطين

## توثيق الـAPI التفاعلي
بعد تشغيل المشروع: http://localhost:3000/api/docs
