import 'dotenv/config';
import { google } from 'googleapis';
import { PrismaClient } from '@prisma/client';
import { channelConfigs } from './channels-config.js';

const prisma = new PrismaClient();
const youtube = google.youtube({ version: 'v3', auth: process.env.YOUTUBE_API_KEY });

// ---- Helpers ----

/**
 * Convert ISO 8601 duration (PT1H2M3S) to seconds.
 * Used because YouTube returns durations in this format.
 */
function parseDuration(iso) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const [, h, m, s] = match;
  return (parseInt(h) || 0) * 3600 + (parseInt(m) || 0) * 60 + (parseInt(s) || 0);
}

/**
 * Search YouTube for videos matching a query.
 * Returns array of video IDs.
 */
async function searchVideos(query, maxResults = 25) {
  const res = await youtube.search.list({
    part: ['snippet'],
    q: query,
    type: ['video'],
    videoEmbeddable: 'true',         // pre-filter — saves us follow-up calls
    videoDuration: 'medium',          // 4–20 min — drops shorts and full-length docs
    maxResults,
    relevanceLanguage: 'en',
    safeSearch: 'moderate',
  });
  return (res.data.items || []).map(item => ({
    youtubeId: item.id.videoId,
    title: item.snippet.title,
  }));
}

/**
 * Fetch full details (duration, embed status) for up to 50 video IDs in one call.
 * search.list does NOT return durations — separate call needed.
 */
async function fetchVideoDetails(videoIds) {
  if (videoIds.length === 0) return [];

  const res = await youtube.videos.list({
    part: ['contentDetails', 'status'],
    id: videoIds,
    maxResults: 50,
  });

  return (res.data.items || []).map(item => ({
    youtubeId: item.id,
    durationSec: parseDuration(item.contentDetails.duration),
    embeddable: item.status.embeddable === true,
    privacyStatus: item.status.privacyStatus,
  }));
}

// ---- Main flow per channel ----

async function populateChannel(channel, config) {
  console.log(`\n📺 Channel ${channel.number} — ${channel.name}`);
  console.log(`   Searches: ${config.searches.length}, target: ${config.targetCount}`);

  // 1. Find existing videos in pool — we'll skip these
  const existing = await prisma.videoPool.findMany({
    where: { channelId: channel.id },
    select: { youtubeId: true },
  });
  const existingIds = new Set(existing.map(v => v.youtubeId));
  console.log(`   ${existingIds.size} videos already in pool, will skip`);

  // 2. Search across all queries, collect candidates
  const candidates = new Map();  // youtubeId -> { youtubeId, title }
  for (const query of config.searches) {
    try {
      const results = await searchVideos(query, 25);
      for (const r of results) {
        if (!existingIds.has(r.youtubeId) && !candidates.has(r.youtubeId)) {
          candidates.set(r.youtubeId, r);
        }
      }
    } catch (err) {
      console.warn(`   ⚠️  search failed for "${query}": ${err.message}`);
    }
  }
  console.log(`   ${candidates.size} unique candidates after dedupe`);

  // 3. Fetch details in batches of 50
  const candidateIds = Array.from(candidates.keys());
  const details = [];
  for (let i = 0; i < candidateIds.length; i += 50) {
    const batch = candidateIds.slice(i, i + 50);
    const batchDetails = await fetchVideoDetails(batch);
    details.push(...batchDetails);
  }

  // 4. Filter — must be embeddable, public, within duration range
  const filtered = details
    .filter(d => d.embeddable && d.privacyStatus === 'public')
    .filter(d => d.durationSec >= config.minDurationSec && d.durationSec <= config.maxDurationSec)
    .slice(0, config.targetCount)
    .map(d => ({
      channelId: channel.id,
      youtubeId: d.youtubeId,
      title: candidates.get(d.youtubeId).title,
      durationSec: d.durationSec,
    }));

  console.log(`   ${filtered.length} pass filters, inserting...`);

  // 5. Insert into video_pool
  if (filtered.length > 0) {
    const result = await prisma.videoPool.createMany({
      data: filtered,
      skipDuplicates: true,  // safety net for the @@unique([channelId, youtubeId]) constraint
    });
    console.log(`   ✓ Added ${result.count} new videos`);
  } else {
    console.log(`   (nothing to add)`);
  }
}

// ---- Entry point ----

async function main() {
  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY not set in .env');
  }

  console.log('🎬 ReLiveTV — populating video pool from YouTube');

  const channels = await prisma.channel.findMany({ orderBy: { number: 'asc' } });
  if (channels.length === 0) {
    throw new Error('No channels found. Run `npx prisma db seed` first.');
  }

  for (const channel of channels) {
    const config = channelConfigs[channel.slug];
    if (!config) {
      console.warn(`\n⚠️  No config for channel "${channel.slug}", skipping`);
      continue;
    }
    await populateChannel(channel, config);
  }

  // Final summary
  console.log('\n📊 Final pool stats:');
  const all = await prisma.channel.findMany({
    include: { _count: { select: { videos: true } } },
    orderBy: { number: 'asc' },
  });
  for (const c of all) {
    console.log(`   Ch ${c.number} — ${c.name}: ${c._count.videos} videos`);
  }

  console.log('\n✓ Done.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Populate failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });