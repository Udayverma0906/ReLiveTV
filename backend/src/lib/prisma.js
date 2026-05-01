import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// Graceful disconnect on shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});