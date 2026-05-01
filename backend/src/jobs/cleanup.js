import { prisma } from '../lib/prisma.js';

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;       // every 5 min
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;  // 24 hours

export function startCleanupJob(logger) {
  const run = async () => {
    try {
      const cutoff = new Date(Date.now() - SESSION_MAX_AGE_MS);
      const result = await prisma.session.deleteMany({
        where: {
          lastActivity: { lt: cutoff },
        },
      });
      if (result.count > 0) {
        logger.info(`[cleanup] deleted ${result.count} stale sessions`);
      }
    } catch (err) {
      logger.error('[cleanup] failed:', err);
    }
  };

  // Run once on startup
  run();
  // Then every 5 min
  return setInterval(run, CLEANUP_INTERVAL_MS);
}