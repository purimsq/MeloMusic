// View 7: YouTube Music-Style Synced Lyrics View (Full-Screen Responsive & Floating Share)
import { Icons } from './icons.js';
import { DEFAULT_FALLBACK_COVER } from '../data/samples.js';

export function renderLyricsModal(container, { audioEngine, onClose }) {
  const currentTrack = audioEngine.currentTrack;

  container.innerHTML = `
    <div class="lyrics-yt-view" id="lyrics-yt-view">
      <!-- Background Ambient Glow -->
      <div class="lyrics-ambient-glow" id="lyrics-ambient-glow"></div>

      <!-- Top Mini-Track Bar -->
      <div class="lyrics-yt-mini-bar">
        <div class="mini-track-left">
          <img class="mini-track-thumb" id="yt-mini-thumb" 
               src="${currentTrack ? (currentTrack.cover || DEFAULT_FALLBACK_COVER) : DEFAULT_FALLBACK_COVER}" 
               alt="Track Cover" />
          <div class="mini-track-info">
            <span class="mini-track-title" id="yt-mini-title">${currentTrack ? currentTrack.title : 'Track Title'}</span>
            <span class="mini-track-artist" id="yt-mini-artist">${currentTrack ? currentTrack.artist : 'Artist'}</span>
          </div>
        </div>

        <div class="mini-track-actions">
          <button style="background:none; border:none; color:#fff; cursor:pointer;" title="Cast Audio">
            ${Icons.cast(20)}
          </button>
          <button id="btn-yt-mini-play" style="background:none; border:none; color:#fff; cursor:pointer;" title="Play / Pause">
            ${audioEngine.isPlaying ? Icons.pause(20) : Icons.play(20)}
          </button>
        </div>
      </div>

      <!-- Main Lyrics Header Section -->
      <div class="lyrics-yt-header">
        <div class="lyrics-yt-drag-pill"></div>
        <h2 class="lyrics-yt-title">Lyrics</h2>
        <button class="btn-close-yt-lyrics" id="btn-close-yt-lyrics" title="Close Lyrics">
          ${Icons.close(22)}
        </button>
      </div>

      <!-- Quick Sync Controls -->
      <div class="lyrics-quick-sync-bar">
        <span class="quick-sync-label">Sync Offset: <span id="yt-offset-val">0.0s</span></span>
        <div class="quick-sync-btns">
          <button class="btn-yt-sync" id="btn-yt-sub">-0.5s</button>
          <button class="btn-yt-sync" id="btn-yt-add">+0.5s</button>
          <button class="btn-yt-sync" id="btn-yt-snap" style="background: #FFFFFF; color: #111;">Sync Now</button>
          <button class="btn-yt-sync" id="btn-yt-reset">0.0s</button>
        </div>
      </div>

      <!-- Scrollable Lyrics Container with Bottom Gradient (Lyrics emerging from underneath) -->
      <div class="lyrics-yt-scroll" id="yt-lyrics-lines-container">
        <!-- Lines rendered dynamically -->
      </div>

      <!-- Floating Share Pill Dock (Anchored at bottom, lyrics scroll behind it) -->
      <div class="lyrics-floating-share-dock">
        <button class="btn-yt-share-pill" id="btn-lyrics-share">
          ${Icons.share(18)}
          <span>Share</span>
        </button>
      </div>
    </div>
  `;

  const view = container.querySelector('#lyrics-yt-view');
  const linesContainer = container.querySelector('#yt-lyrics-lines-container');
  const miniThumb = container.querySelector('#yt-mini-thumb');
  const miniTitle = container.querySelector('#yt-mini-title');
  const miniArtist = container.querySelector('#yt-mini-artist');
  const miniPlayBtn = container.querySelector('#btn-yt-mini-play');
  const offsetVal = container.querySelector('#yt-offset-val');
  const closeBtn = container.querySelector('#btn-close-yt-lyrics');
  const shareBtn = container.querySelector('#btn-lyrics-share');

  function renderLines() {
    const lines = audioEngine.lyricsEngine.lines;
    if (!lines || lines.length === 0) {
      linesContainer.innerHTML = `
        <div style="padding: 80px 10px; color: rgba(255,255,255,0.4); font-size: 18px; text-align: center;">
          No synchronized lyrics found for this track.<br/>
          <span style="font-size: 13px; color: rgba(255,255,255,0.3); margin-top: 10px; display: inline-block;">Enjoy the flow.</span>
        </div>
      `;
      return;
    }

    linesContainer.innerHTML = lines.map((item, idx) => `
      <div class="lyric-yt-line" data-index="${idx}" data-time="${item.time}">
        ${item.text}
      </div>
    `).join('');
  }

  renderLines();

  let lastActiveIdx = -1;
  function updateActiveLyric(idx) {
    if (idx === lastActiveIdx) return;
    lastActiveIdx = idx;

    const allLines = linesContainer.querySelectorAll('.lyric-yt-line');
    allLines.forEach((el, i) => {
      if (i === idx) {
        el.classList.add('active');
        // Container-local smooth scroll: never touches ancestors or parent windows
        const containerRect = linesContainer.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const offset = (elRect.top - containerRect.top) - (containerRect.height / 2) + (elRect.height / 2);
        linesContainer.scrollBy({ top: offset, behavior: 'smooth' });
      } else {
        el.classList.remove('active');
      }
    });
  }

  // Click any line to seek directly to that second!
  linesContainer.addEventListener('click', (e) => {
    const lineEl = e.target.closest('.lyric-yt-line');
    if (!lineEl) return;
    const time = parseFloat(lineEl.dataset.time);
    if (!isNaN(time)) {
      audioEngine.seek(time);
    }
  });

  // Mini bar play/pause
  miniPlayBtn.addEventListener('click', () => audioEngine.togglePlay());

  // Quick Sync Toolbar
  container.querySelector('#btn-yt-sub').addEventListener('click', () => {
    const off = audioEngine.lyricsEngine.adjustOffset(-0.5);
    offsetVal.textContent = `${off >= 0 ? '+' : ''}${off.toFixed(1)}s`;
  });

  container.querySelector('#btn-yt-add').addEventListener('click', () => {
    const off = audioEngine.lyricsEngine.adjustOffset(0.5);
    offsetVal.textContent = `${off >= 0 ? '+' : ''}${off.toFixed(1)}s`;
  });

  container.querySelector('#btn-yt-reset').addEventListener('click', () => {
    const off = audioEngine.lyricsEngine.resetOffset();
    offsetVal.textContent = '0.0s';
  });

  container.querySelector('#btn-yt-snap').addEventListener('click', () => {
    const curTime = audioEngine.currentTime;
    const activeIdx = audioEngine.lyricsEngine.getActiveIndex(curTime);
    updateActiveLyric(activeIdx);
  });

  // Share button interaction
  shareBtn.addEventListener('click', async () => {
    const activeLine = linesContainer.querySelector('.lyric-yt-line.active');
    const quote = activeLine ? activeLine.textContent.trim() : (audioEngine.currentTrack ? audioEngine.currentTrack.title : 'Melo Music');
    if (navigator.share) {
      try {
        await navigator.share({
          title: audioEngine.currentTrack?.title || 'Melo',
          text: `"${quote}" — ${audioEngine.currentTrack?.artist || 'Melo'}`
        });
      } catch (e) {}
    } else {
      shareBtn.innerHTML = `${Icons.check(18)} <span>Copied!</span>`;
      navigator.clipboard?.writeText(`"${quote}" — ${audioEngine.currentTrack?.artist || 'Melo'}`);
      setTimeout(() => {
        shareBtn.innerHTML = `${Icons.share(18)} <span>Share</span>`;
      }, 1800);
    }
  });

  // Subscriptions
  audioEngine.subscribe('trackChange', (track) => {
    miniTitle.textContent = track.title;
    miniArtist.textContent = track.artist;
    miniThumb.src = track.cover || DEFAULT_FALLBACK_COVER;
    renderLines();
  });

  audioEngine.subscribe('playStateChange', ({ isPlaying }) => {
    miniPlayBtn.innerHTML = isPlaying ? Icons.pause(20) : Icons.play(20);
  });

  audioEngine.subscribe('lyricsUpdate', ({ activeIndex }) => {
    if (view.classList.contains('open')) {
      updateActiveLyric(activeIndex);
    }
  });

  closeBtn.addEventListener('click', () => {
    view.classList.remove('open');
    if (onClose) onClose();
  });

  return {
    open() {
      view.scrollTop = 0;
      view.classList.add('open');
      renderLines();
      linesContainer.scrollTop = 0;
      const curTime = audioEngine.currentTime;
      const activeIdx = audioEngine.lyricsEngine.getActiveIndex(curTime);
      updateActiveLyric(activeIdx);
    },
    close() {
      view.classList.remove('open');
      if (onClose) onClose();
    },
    isOpen() {
      return view.classList.contains('open');
    }
  };
}
