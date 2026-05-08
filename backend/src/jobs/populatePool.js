import { google } from 'googleapis';
import { prisma } from '../lib/prisma.js';
import { channelConfigs } from '../../scripts/channels-config.js';

const youtube = google.youtube({ version: 'v3', auth: process.env.YOUTUBE_API_KEY });

function parseDuration(iso) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const [, h, m, s] = match;
  return (parseInt(h) || 0) * 3600 + (parseInt(m) || 0) * 60 + (parseInt(s) || 0);
}

async function searchVideos(query, maxResults = 25) {
  const res = await youtube.search.list({
    part: ['snippet'],
    q: query,
    type: ['video'],
    videoEmbeddable: 'true',
    videoDuration: 'medium',
    maxResults,
    relevanceLanguage: 'en',
    safeSearch: 'moderate',
  });
  return (res.data.items || []).map((item) => ({
    youtubeId: item.id.videoId,
    title: item.snippet.title,
  }));
}

async function fetchVideoDetails(videoIds) {
  if (videoIds.length === 0) return [];
  const res = await youtube.videos.list({
    part: ['contentDetails', 'status'],
    id: videoIds,
    maxResults: 50,
  });
  return (res.data.items || []).map((item) => ({
    youtubeId: item.id,
    durationSec: parseDuration(item.contentDetails.duration),
    embeddable: item.status.embeddable === true,
    privacyStatus: item.status.privacyStatus,
  }));
}

async function populateChannel(channel, config) {
  // Search across all queries, dedupe candidates
  const candidates = new Map();
  for (const query of config.searches) {
    try {
      const results = await searchVideos(query, 25);
      for (const r of results) {
        if (!candidates.has(r.youtubeId)) {
          candidates.set(r.youtubeId, r);
        }
      }
    } catch (err) {
      console.warn(`[populate] search failed for "${query}": ${err.message}`);
    }
  }

  // Batch-fetch details for all candidates
  const candidateIds = Array.from(candidates.keys());
  const details = [];
  for (let i = 0; i < candidateIds.length; i += 50) {
    const batch = candidateIds.slice(i, i + 50);
    const batchDetails = await fetchVideoDetails(batch);
    details.push(...batchDetails);
  }

  // Filter: must be embeddable, public, within duration range
  const filtered = details
    .filter((d) => d.embeddable && d.privacyStatus === 'public')
    .filter((d) => d.durationSec >= config.minDurationSec && d.durationSec <= config.maxDurationSec)
    .slice(0, config.targetCount)
    .map((d) => ({
      channelId: channel.id,
      youtubeId: d.youtubeId,
      title: candidates.get(d.youtubeId).title,
      durationSec: d.durationSec,
    }));

  // Safety: if filters rejected everything, keep existing pool rather than wipe-empty
  if (filtered.length === 0) {
    console.warn(`[populate] no eligible videos found for ${channel.name}, keeping existing pool`);
    return { added: 0, removed: 0 };
  }

  // ---- Wipe and replace in transaction ----
  const result = await prisma.$transaction([
    prisma.videoPool.deleteMany({ where: { channelId: channel.id } }),
    prisma.videoPool.createMany({ data: filtered }),
  ]);

  return {
    added: result[1].count,
    removed: result[0].count,
  };
}

export async function populateAllChannels() {
  const channels = await prisma.channel.findMany({ orderBy: { number: 'asc' } });
  const results = [];
  for (const channel of channels) {
    const config = channelConfigs[channel.slug];
    if (!config) {
      console.warn(`[populate] no config for channel "${channel.slug}"`);
      continue;
    }
    const result = await populateChannel(channel, config);
    results.push({
      channel: channel.number,
      name: channel.name,
      removed: result.removed,
      added: result.added,
    });
    console.log(
      `[populate] channel ${channel.number} (${channel.name}): -${result.removed} removed, +${result.added} added`
    );
  }
  return results;
}