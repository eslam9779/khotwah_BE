/**
 * ClassPilot Seed File
 * Run: npm run db:seed
 * Creates test data for development
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean up existing data (dev only)
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.examGrade.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.paymentExemption.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.qRSession.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.classEnrollment.deleteMany();
  await prisma.class.deleteMany();
  await prisma.parentStudentLink.deleteMany();
  await prisma.parentInvitation.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacherProfile.deleteMany();
  await prisma.parentProfile.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 12);

  // ── Teacher 1 ──────────────────────────────────────────────
  const teacher1User = await prisma.user.create({
    data: {
      email: 'teacher1@classpilot.dev',
      passwordHash,
      role: 'TEACHER',
      firstName: 'Ahmed',
      lastName: 'Hassan',
    },
  });
  const teacher1 = await prisma.teacherProfile.create({
    data: {
      userId: teacher1User.id,
      bio: 'Math teacher with 10 years experience',
      subject: 'Mathematics',
      qrEnabled: true,
    },
  });
  console.log('✅ Teacher 1 created:', teacher1User.email);

  // ── Teacher 2 (for isolation testing) ─────────────────────
  const teacher2User = await prisma.user.create({
    data: {
      email: 'teacher2@classpilot.dev',
      passwordHash,
      role: 'TEACHER',
      firstName: 'Fatima',
      lastName: 'Nour',
    },
  });
  const teacher2 = await prisma.teacherProfile.create({
    data: {
      userId: teacher2User.id,
      subject: 'Science',
      qrEnabled: false,
    },
  });
  console.log('✅ Teacher 2 created:', teacher2User.email);

  // ── Parent ─────────────────────────────────────────────────
  const parentUser = await prisma.user.create({
    data: {
      email: 'parent@classpilot.dev',
      passwordHash,
      role: 'PARENT',
      firstName: 'Mohamed',
      lastName: 'Ali',
    },
  });
  const parentProfile = await prisma.parentProfile.create({
    data: { userId: parentUser.id },
  });
  console.log('✅ Parent created:', parentUser.email);

  // ── Students for Teacher 1 ─────────────────────────────────
  const students = await Promise.all([
    prisma.student.create({
      data: {
        teacherId: teacher1.id,
        firstName: 'Sara',
        lastName: 'Mohamed',
        email: 'sara@test.dev',
        phone: '+201001111111',
      },
    }),
    prisma.student.create({
      data: {
        teacherId: teacher1.id,
        firstName: 'Omar',
        lastName: 'Khaled',
        email: 'omar@test.dev',
        phone: '+201002222222',
      },
    }),
    prisma.student.create({
      data: {
        teacherId: teacher1.id,
        firstName: 'Nour',
        lastName: 'Ibrahim',
        email: 'nour@test.dev',
      },
    }),
  ]);
  console.log(`✅ Created ${students.length} students for Teacher 1`);

  // ── Student for Teacher 2 (isolation test) ─────────────────
  await prisma.student.create({
    data: {
      teacherId: teacher2.id,
      firstName: 'Ali',
      lastName: 'Teacher2Student',
    },
  });
  console.log('✅ Created student for Teacher 2');

  // ── Class ──────────────────────────────────────────────────
  const mathClass = await prisma.class.create({
    data: {
      teacherId: teacher1.id,
      name: 'Math Group A',
      subject: 'Mathematics',
      description: 'Advanced algebra and geometry',
    },
  });

  // Enroll students
  await prisma.classEnrollment.createMany({
    data: students.map((s) => ({ classId: mathClass.id, studentId: s.id })),
  });
  console.log('✅ Class created with enrollments');

  // ── Attendance Session ─────────────────────────────────────
  const session = await prisma.attendanceSession.create({
    data: {
      teacherId: teacher1.id,
      classId: mathClass.id,
      sessionDate: new Date('2026-10-15T10:00:00.000Z'),
      topic: 'Chapter 5 — Quadratic Equations',
    },
  });

  await prisma.attendanceRecord.createMany({
    data: [
      { sessionId: session.id, studentId: students[0].id, status: 'PRESENT' },
      { sessionId: session.id, studentId: students[1].id, status: 'ABSENT' },
      { sessionId: session.id, studentId: students[2].id, status: 'LATE' },
    ],
  });
  console.log('✅ Attendance session + records created');

  // ── Payment ────────────────────────────────────────────────
  const payment1 = await prisma.payment.create({
    data: {
      studentId: students[0].id,
      teacherId: teacher1.id,
      amount: 500,
      currency: 'EGP',
      description: 'October Monthly Fees',
      status: 'PENDING',
      dueDate: new Date('2026-10-31'),
    },
  });

  // Exempted payment
  const payment2 = await prisma.payment.create({
    data: {
      studentId: students[2].id,
      teacherId: teacher1.id,
      amount: 500,
      currency: 'EGP',
      description: 'October Monthly Fees',
      status: 'EXEMPTED',
      dueDate: new Date('2026-10-31'),
    },
  });
  await prisma.paymentExemption.create({
    data: {
      paymentId: payment2.id,
      type: 'FULL',
      reason: 'Financial hardship — approved by management',
      approvedById: teacher1.id,
    },
  });
  console.log('✅ Payments + exemption created');

  // ── Exam ───────────────────────────────────────────────────
  const exam = await prisma.exam.create({
    data: {
      teacherId: teacher1.id,
      classId: mathClass.id,
      title: 'Midterm Exam',
      totalMarks: 100,
      passingMarks: 50,
      examDate: new Date('2026-11-01T09:00:00.000Z'),
    },
  });
  await prisma.examGrade.create({
    data: {
      examId: exam.id,
      studentId: students[0].id,
      marksObtained: 87,
      grade: 'A',
      feedback: 'Excellent performance!',
      gradedById: teacher1.id,
    },
  });
  console.log('✅ Exam + grade created');

  // ── Parent Link ────────────────────────────────────────────
  await prisma.parentStudentLink.create({
    data: {
      parentId: parentProfile.id,
      studentId: students[0].id,
      canViewAttendance: true,
      canViewGrades: true,
      canViewPayments: false,
      canViewAssessments: false,
      canViewFiles: true,
      isActive: true,
    },
  });
  console.log('✅ Parent linked to student Sara');

  console.log('\n🎉 Seed complete!\n');
  console.log('📧 Login credentials:');
  console.log('  Teacher 1: teacher1@classpilot.dev / Password123!');
  console.log('  Teacher 2: teacher2@classpilot.dev / Password123!');
  console.log('  Parent:    parent@classpilot.dev   / Password123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
