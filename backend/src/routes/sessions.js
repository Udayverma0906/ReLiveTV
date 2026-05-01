import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { prisma } from '../lib/prisma.js';
import { generateCode } from '../lib/code.js';

const router = Router();

/**
 * POST /api/sessions
 * Creates a new session for the authenticated user.
 * Returns { id, code }.
 */
router.post('/', requireAuth, async (req, res) => {
  // Retry on the (very rare) collision
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode(6);
    try {
      const session = await prisma.session.create({
        data: {
          code,
          userId: req.user.id,
          // Default to channel 1; we'll switch via remote later
          currentChannelId: null,
        },
        select: { id: true, code: true, createdAt: true },
      });
      return res.status(201).json(session);
    } catch (err) {
      if (err.code === 'P2002') {
        // Unique constraint failed on `code` - retry
        continue;
      }
      console.error('[sessions.create] error:', err);
      return res.status(500).json({ error: 'Failed to create session' });
    }
  }
  return res.status(500).json({ error: 'Could not generate unique code, try again' });
});

/**
 * GET /api/sessions/:code
 * Look up a session by code. Used by the Remote to validate before joining.
 * Public (no auth) — anyone with a code can pair.
 */
router.get('/:code', async (req, res) => {
  const { code } = req.params;
  const session = await prisma.session.findUnique({
    where: { code: code.toUpperCase() },
    select: { id: true, code: true, createdAt: true },
  });
  if (!session) {
    return res.status(404).json({ error: 'Invalid code' });
  }
  return res.json(session);
});

export default router;