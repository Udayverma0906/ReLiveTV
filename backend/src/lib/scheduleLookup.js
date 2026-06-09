import { prisma } from './prisma.js';

/**
 * Get the current scheduled video for a channel, skipping broken videos.
 * Falls back to random pool pick if schedule has no entries.
 * Used by both the REST GET /current endpoint and the socket channel_change handler.
 */
export async function getCurrentVideoForChannel(channelId) {
  const now = new Date();

  // Find the entry currently covering "now"
  let entry = await prisma.scheduleEntry.findFirst({
    where: {
      channelId,
      startTime: { lte: now },
      endTime: { gt: now },
    },
    orderBy: { startTime: 'asc' },
  });

  // Skip past broken entries
  let safetyCount = 0;
  while (entry && safetyCount < 50) {
    safetyCount += 1;
    const poolVideo = await prisma.videoPool.findFirst({
      where: { channelId, youtubeId: entry.videoYoutubeId },
      select: { isBroken: true },
    });

    if (!poolVideo || !poolVideo.isBroken) break;

    entry = await prisma.scheduleEntry.findFirst({
      where: { channelId, startTime: { gte: entry.endTime } },
      orderBy: { startTime: 'asc' },
    });
  }

  if (entry) {
    // Find next non-broken entry
    let nextEntry = await prisma.scheduleEntry.findFirst({
      where: { channelId, startTime: { gte: entry.endTime } },
      orderBy: { startTime: 'asc' },
    });

    let nextSafety = 0;
    while (nextEntry && nextSafety < 50) {
      nextSafety += 1;
      const nextPool = await prisma.videoPool.findFirst({
        where: { channelId, youtubeId: nextEntry.videoYoutubeId },
        select: { isBroken: true },
      });
      if (!nextPool || !nextPool.isBroken) break;

      nextEntry = await prisma.scheduleEntry.findFirst({
        where: { channelId, startTime: { gte: nextEntry.endTime } },
        orderBy: { startTime: 'asc' },
      });
    }

    return {
      video: {
        youtubeId: entry.videoYoutubeId,
        title: entry.title,
        durationSec: entry.durationSec,
      },
      offsetSec: Math.floor((now - entry.startTime) / 1000),
      synced: true,
      endTime: entry.endTime,
      next: nextEntry ? {
        title: nextEntry.title,
        startTime: nextEntry.startTime,
        endTime: nextEntry.endTime,
      } : null,
    };
  }

  // Fallback: random pool pick
  const candidates = await prisma.videoPool.findMany({
    where: { channelId, isBroken: false },
    select: { youtubeId: true, title: true, durationSec: true },
  });

  if (candidates.length === 0) return null;

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return {
    video: {
      youtubeId: pick.youtubeId,
      title: pick.title,
      durationSec: pick.durationSec,
    },
    offsetSec: 0,
    synced: false,
    endTime: null,
    next: null,
  };
}