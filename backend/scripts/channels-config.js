/**
 * Search terms and filters per channel.
 * Edit this file to change what gets pulled into the video pool.
 *
 * Tips:
 * - More search terms = more variety. Each term costs 100 quota units.
 * - Duration filters in seconds. Be realistic about content lengths.
 * - targetCount is per channel. Script stops searching once met.
 *
 * Embed-blocking notes:
 * - NFL, NBA, MLB, FIFA, and most major US sports block off-YouTube embeds
 * - Music labels (Sony, UMG, Warner) often block; live sessions and indie are safer
 * - Use channel-specific or niche queries to avoid hitting blocked mainstream content
 */

export const channelConfigs = {
  comedy: {
    searches: [
      'stand up comedy clip',
      'late night monologue jimmy fallon',
      'late night seth meyers a closer look',
      'snl sketch full episode',
      'tim robinson sketch',
      'key and peele sketch',
      'i think you should leave',
      'comedy bang bang',
      'conan remembers',
    ],
    minDurationSec: 60,
    maxDurationSec: 1200,        // bumped to allow longer late-night segments
    targetCount: 30,
  },

  crime: {
    searches: [
      'true crime documentary short',
      'cold case solved explained',
      'unsolved mystery documentary',
      'crime investigation story',
      'serial killer documentary',
      'forensic files episode',
      'criminal podcast story',
      'lemmino crime',
      'murder mystery solved',
    ],
    minDurationSec: 600,
    maxDurationSec: 2700,
    targetCount: 30,
  },

  news: {
    searches: [
      'dw news daily briefing',
      'al jazeera english news',
      'bbc news report',
      'pbs newshour segment',
      'wsj news explainer',
      'vox explained news',
      'tech news today verge',
      'science news explained',
      'business insider report',
    ],
    minDurationSec: 120,
    maxDurationSec: 1200,
    targetCount: 30,
  },

  music: {
    searches: [
      'tiny desk concert npr',
      'audiotree live session',
      'kexp full performance',
      'sofar sounds live',
      'colors show live music',
      'acoustic session live',
      'live in studio performance',
      'mahogany sessions live',
      'jam in the van session',
    ],
    minDurationSec: 180,
    maxDurationSec: 1800,
    targetCount: 30,
  },

  sports: {
    searches: [
      'olympics highlights moments',
      'extreme sports compilation',
      'parkour amazing moments',
      'skateboarding tricks compilation',
      'rock climbing competition',
      'chess world championship match',
      'table tennis world championship',
      'snooker century break',
      'cricket great moments',
      'amazing chess puzzle solved',
    ],
    minDurationSec: 180,
    maxDurationSec: 1500,
    targetCount: 30,
  },
};