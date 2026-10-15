// LRCLIB Synced Lyrics parser and timing synchronization engine

export class LyricsEngine {
  constructor() {
    this.lines = []; // Array of { time: seconds, text: string }
    this.offset = 0; // manual offset in seconds (e.g. +0.5s or -0.5s)
  }

  // Parses .lrc string into timestamped lines
  parseLrc(lrcText) {
    if (!lrcText) {
      this.lines = [];
      return [];
    }

    const lines = lrcText.split('\n');
    const parsed = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.?(\d{2,3})?\]/g;

    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;

      let match;
      const timestamps = [];
      while ((match = timeRegex.exec(trimmed)) !== null) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const ms = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
        const totalSec = min * 60 + sec + ms / 1000;
        timestamps.push(totalSec);
      }

      const text = trimmed.replace(timeRegex, '').trim();
      if (text && timestamps.length > 0) {
        for (const t of timestamps) {
          parsed.push({ time: t, text });
        }
      }
    }

    // Sort by timestamp
    parsed.sort((a, b) => a.time - b.time);
    this.lines = parsed;
    return this.lines;
  }

  // Adjusts manual sync offset (user requested +0.5s / -0.5s nudge)
  adjustOffset(deltaSec) {
    this.offset += deltaSec;
    return this.offset;
  }

  resetOffset() {
    this.offset = 0;
    return this.offset;
  }

  // Finds current active lyric index based on audio playback time
  getActiveIndex(currentTime) {
    if (!this.lines || this.lines.length === 0) return -1;
    const adjustedTime = currentTime + this.offset;

    let activeIndex = -1;
    for (let i = 0; i < this.lines.length; i++) {
      if (this.lines[i].time <= adjustedTime) {
        activeIndex = i;
      } else {
        break;
      }
    }
    return activeIndex;
  }
}
