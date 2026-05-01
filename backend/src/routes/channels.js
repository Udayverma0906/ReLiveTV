import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

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
 *
 * STEP 5 NOTE: This currently picks a random video from the pool.
 * After Step 5, replace the implementation with a schedule lookup:
 *   SELECT video_youtube_id, start_time
 *   FROM schedule_entries
 *   WHERE channel_id = $1
 *     AND start_time <= NOW() AND end_time > NOW()
 *   LIMIT 1
 */
router.get('/:idOrNumber/current', async (req, res) => {
  const { idOrNumber } = req.params;

  // Accept either UUID or channel number
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

  // ---- TEMP: random pool pick (replace with schedule lookup in Step 5) ----
  const candidates = await prisma.videoPool.findMany({
    where: { channelId: channel.id, isBroken: false },
    select: { youtubeId: true, title: true, durationSec: true },
  });

  if (candidates.length === 0) {
    return res.status(404).json({ error: 'No videos available for this channel' });
  }

  const pick = candidates[Math.floor(Math.random() * candidates.length)];

  res.json({
    channel,
    video: {
      youtubeId: pick.youtubeId,
      title: pick.title,
      durationSec: pick.durationSec,
    },
    // Random offset to give a "tuning into a live channel" feel
    // Step 5 will replace this with the real time-based offset
    offsetSec: Math.floor(Math.random() * Math.max(1, pick.durationSec - 30)),
  });
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