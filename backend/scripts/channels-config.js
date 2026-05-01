/**
 * Search terms and filters per channel.
 * Edit this file to change what gets pulled into the video pool.
 *
 * Tips:
 * - More search terms = more variety. Each term costs 100 quota units.
 * - Duration filters in seconds. Be realistic about content lengths.
 * - targetCount is per channel. Script stops searching once met.
 */

export const channelConfigs = {
  comedy: {
    searches: [
      'stand up comedy clip',
      'late night comedy bit',
      'comedy sketch funny',
      'tim robinson sketch',
      'key and peele',
    ],
    minDurationSec: 60,        // skip shorts
    maxDurationSec: 900,       // skip 15+ min specials
    targetCount: 25,
  },

  crime: {
    searches: [
      'true crime documentary short',
      'cold case solved explained',
      'unsolved mystery documentary',
      'true crime case file',
      'investigative crime story',
    ],
    minDurationSec: 600,       // crime content is long-form
    maxDurationSec: 2700,      // up to 45 min
    targetCount: 25,
  },

  news: {
    searches: [
      'world news today',
      'breaking news report',
      'tech news weekly',
      'science news explained',
      'business news headlines',
    ],
    minDurationSec: 120,
    maxDurationSec: 1200,
    targetCount: 25,
  },

  music: {
    searches: [
      'npr tiny desk concert',
      'live music performance acoustic',
      'live concert performance hd',
      'colors show live music',
      'kexp live performance',
    ],
    minDurationSec: 180,
    maxDurationSec: 1800,
    targetCount: 25,
  },

  sports: {
    searches: [
      'sports highlights compilation',
      'top 10 sports moments',
      'best sports plays',
      'classic match highlights',
      'amazing sports goals',
    ],
    minDurationSec: 180,
    maxDurationSec: 1500,
    targetCount: 25,
  },
};