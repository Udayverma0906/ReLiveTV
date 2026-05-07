import { prisma } from '../lib/prisma.js';

const SCHEDULE_HORIZON_HOURS = 48;
const MIN_VIDEO_DURATION = 30;
const MAX_VIDEO_DURATION = 3600;

/**
 * Generate a 48-hour schedule for one channel by picking videos
 * from the pool and chaining them by duration.
 */
export async function generateScheduleForChannel(channelId, startAt = new Date()) {
  const horizonMs = SCHEDULE_HORIZON_HOURS * 60 * 60 * 1000;
  const endAt = new Date(startAt.getTime() + horizonMs);

  const videos = await prisma.videoPool.findMany({
    where: {
      channelId,
      isBroken: false,
      durationSec: { gte: MIN_VIDEO_DURATION, lte: MAX_VIDEO_DURATION },
    },
    select: { youtubeId: true, durationSec: true, title: true },
  });

  if (videos.length === 0) {
    console.warn(`[schedule] no eligible videos for channel ${channelId}`);
    return { count: 0, totalSeconds: 0 };
  }

  // Shuffle (Fisher-Yates)
  const shuffled = [...videos];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Build entries by chaining videos
  const entries = [];
  let cursor = startAt;
  let videoIdx = 0;

  while (cursor < endAt) {
    const video = shuffled[videoIdx % shuffled.length];
    const entryEnd = new Date(cursor.getTime() + video.durationSec * 1000);

    entries.push({
      channelId,
      videoYoutubeId: video.youtubeId,
      title: video.title,           // <-- field is `title` per your schema
      durationSec: video.durationSec,
      startTime: cursor,
      endTime: entryEnd,
    });

    cursor = entryEnd;
    videoIdx++;

    if (entries.length > 5000) {
      console.warn(`[schedule] safety brake hit for channel ${channelId}`);
      break;
    }
  }

  // Wipe old entries and insert new ones in one transaction
  await prisma.$transaction([
    prisma.scheduleEntry.deleteMany({ where: { channelId } }),
    prisma.scheduleEntry.createMany({ data: entries }),
  ]);

  const totalSeconds = entries.reduce((sum, e) => sum + e.durationSec, 0);
  return { count: entries.length, totalSeconds };
}

export async function regenerateAllSchedules(startAt = new Date()) {
  const channels = await prisma.channel.findMany({
    select: { id: true, number: true, name: true },
    orderBy: { number: 'asc' },
  });

  const results = [];
  for (const channel of channels) {
    const result = await generateScheduleForChannel(channel.id, startAt);
    results.push({
      channel: channel.number,
      name: channel.name,
      entries: result.count,
      hours: (result.totalSeconds / 3600).toFixed(1),
    });
    console.log(`[schedule] channel ${channel.number} (${channel.name}): ${result.count} entries, ${(result.totalSeconds / 3600).toFixed(1)}hr`);
  }

  return results;
}