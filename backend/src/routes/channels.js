import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { getCurrentVideoForChannel } from '../lib/scheduleLookup.js';

const router = Router();

/**
 * GET /api/channels
 * List all channels. Public.
 */
router.get('/', async (req, res) => {
  const channels = await prisma.channel.findMany({
    orderBy: { number: 'asc' },
    select: {
      id: true,
      number: true,
      name: true,
      slug: true,
      themeColor: true,
      icon: true,
    },
  });
  res.json(channels);
});

/**
 * GET /api/channels/:idOrNumber/current
 * Returns the video that should be playing right now on this channel.
 * Uses the shared schedule lookup helper which skips broken entries.
 */
router.get('/:idOrNumber/current', async (req, res) => {
  try {
    const { idOrNumber } = req.params;

    const channelNumber = parseInt(idOrNumber, 10);
    const where = !isNaN(channelNumber)
      ? { number: channelNumber }
      : { id: idOrNumber };

    const channel = await prisma.channel.findUnique({
      where,
      select: { id: true, number: true, name: true },
    });

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const result = await getCurrentVideoForChannel(channel.id);
    if (!result) {
      return res.status(404).json({ error: 'No videos available for this channel' });
    }

    res.json({
      channel,
      video: result.video,
      offsetSec: result.offsetSec,
      synced: result.synced,
      endTime: result.endTime,
      next: result.next,
    });
  } catch (err) {
    console.error('[channels] /current error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/channels/:idOrNumber/mark-broken
 * Called by the TV when YouTube returns embed errors 101 or 150.
 * Marks the video broken so future picks skip it.
 */
router.post('/:idOrNumber/mark-broken', async (req, res) => {
  const { youtubeId, errorCode } = req.body;
  if (!youtubeId) {
    return res.status(400).json({ error: 'youtubeId required' });
  }

  await prisma.videoPool.updateMany({
    where: { youtubeId },
    data: { isBroken: true },
  });

  await prisma.brokenVideo.create({
    data: {
      youtubeId,
      errorCode: errorCode ?? 0,
    },
  });

  res.json({ marked: true });
});

export default router;