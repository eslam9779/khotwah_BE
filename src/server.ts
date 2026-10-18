import app from './app';
import { config } from './config/env';
import prisma from './config/prisma';

async function main(): Promise<void> {
  // Test DB connection on startup (skip if DB not ready yet)
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (err) {
    console.warn('⚠️  Database not connected — start server anyway (run migrations first)');
  }

  const server = app.listen(config.PORT, () => {
    console.log(`🚀 ClassPilot API running on port ${config.PORT}`);
    console.log(`📚 Swagger Docs: http://localhost:${config.PORT}/api/docs`);
    console.log(`🏥 Health check: http://localhost:${config.PORT}/health`);
    console.log(`🌍 Environment: ${config.NODE_ENV}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log('👋 Server closed');
      process.exit(0);
    });
    // Force exit after 10s
    setTimeout(() => {
      console.error('⚠️  Force exit after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
