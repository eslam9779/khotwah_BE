// Note: PrismaClient types are generated after `npm run db:generate`
// Run: npx prisma generate (requires DATABASE_URL to be set)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client');
import { config } from './env';

type PrismaClientType = InstanceType<typeof PrismaClient>;

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClientType | undefined;
}

// Prevent multiple Prisma Client instances in development (hot reload)
const prisma: PrismaClientType = global.__prisma ?? new PrismaClient({
  log: config.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
});

if (config.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export default prisma;
