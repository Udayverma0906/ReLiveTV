import { Router } from 'express';
import { env } from '../config/env.js';
import { regenerateAllSchedules } from '../jobs/scheduleGenerator.js';
import { populateAllChannels } from '../jobs/populatePool.js';

const router = Router();

function requireAdmin(req, res, next) {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== env.adminSecret) {
    return res.status(401).json({ error: 'Admin access required' });
  }
  next();
}

router.post('/regenerate-schedule', requireAdmin, async (req, res) => {
  // Run in background so HTTP request doesn't time out
  res.json({
    status: 'started',
    message: 'Schedule regeneration running. Check Render logs for progress.',
  });

  regenerateAllSchedules()
    .then((results) => console.log('[admin] schedule done:', results))
    .catch((err) => console.error('[admin] schedule failed:', err));
});

router.post('/refresh-pool', requireAdmin, async (req, res) => {
  res.json({
    status: 'started',
    message: 'Pool refresh running. Check Render logs.',
  });

  populateAllChannels()
    .then((results) => console.log('[admin] pool done:', results))
    .catch((err) => console.error('[admin] pool failed:', err));
});

export default router;