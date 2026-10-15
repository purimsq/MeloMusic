// View 3: Full-Screen Player with Pause-on-Seek Circular Scrubber
import { Icons } from './icons.js';
import { Storage } from '../services/storage.js';
import { DEFAULT_FALLBACK_COVER } from '../data/samples.js';

export function renderPlayerView(container, { audioEngine, onBack, onOpenLyrics, onOpenQueue, onOpenEqualizer }) {
  const currentTrack = audioEngine.currentTrack || audioEngine.queue[0];
  const isLiked = currentTrack ? Storage.isSongLiked(currentTrack.id) : false;

  const R = 140; // Orbit circle radius
  const CX = 160;
  const CY = 160;
  const circumference = 2 * Math.PI * R; // ~879.6

  container.innerHTML = `
    <div class="view view-player" id="view-player">
      <!-- Top Navigation Bar -->
      <div class="player-top-bar">
        <button class="btn-circle-nav" id="btn-player-back" title="Collapse Player">
          ${Icons.chevronDown(22)}
        </button>

        <span class="player-header-title">Now Playing</span>

        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="btn-circle-nav" id="btn-player-equalizer" title="Song Equalizer Studio" style="width: 38px; height: 38px;">
            ${Icons.sliders(18)}
          </button>
          <button class="btn-circle-nav" id="btn-player-queue" title="View Queue / Up Next" style="width: 38px; height: 38px;">
            ${Icons.queue(18)}
          </button>
          <button class="btn-player-lyrics-text" id="btn-top-lyrics" title="Open Lyrics">
            Lyrics
          </button>
        </div>
      </div>

      <!-- Time Indicator (01:23 | 03:40) -->
      <div class="player-time-badge" id="player-time-display">
        00:00 <span>|</span> ${formatTime(currentTrack ? currentTrack.duration : 0)}
      </div>

      <!-- Artwork Section with Circular Orbit Scrubber -->
      <div class="player-artwork-section" id="player-orbit-container">
        <!-- SVG Orbit Circle & Scrubber Dot -->
        <svg class="artwork-orbit-svg" viewBox="0 0 320 320" id="orbit-svg-element">
          <!-- Background Orbit Circle Track -->
          <circle cx="${CX}" cy="${CY}" r="${R}" class="orbit-track-circle" />

          <!-- Filled Progress Circle Arc -->
          <circle id="orbit-progress-fill" cx="${CX}" cy="${CY}" r="${R}" class="orbit-progress-circle-fill" />

          <!-- Orbit Playhead Scrubber Dot -->
          <circle id="orbit-scrubber-dot" cx="${CX}" cy="${CY - R}" r="5" class="orbit-progress-dot" />
        </svg>

        <!-- 8-Lobe Scalloped Floral Mask Artwork -->
        <div class="artwork-flower-mask-wrap" id="artwork-mask-click">
          <div style="width: 100%; height: 100%; clip-path: url(#flower-mask-player); overflow: hidden; background: #222;">
            <img class="artwork-cover-img" id="player-cover-image" 
                 src="${currentTrack ? (currentTrack.cover || DEFAULT_FALLBACK_COVER) : DEFAULT_FALLBACK_COVER}" 
                 alt="${currentTrack ? currentTrack.title : 'Melo'}" />
          </div>
        </div>
      </div>

      <!-- Track Info with Convenient Like Button beside Title -->
      <div class="player-info-container">
        <div class="player-info-text">
          <h2 class="player-track-title" id="player-track-title">
            ${currentTrack ? currentTrack.title : 'NO TRACK PLAYING'}
          </h2>
          <p class="player-artist-name" id="player-artist-name">
            ${currentTrack ? currentTrack.artist : 'Melo Player'}
          </p>
        </div>

        <!-- Convenient Like Button -->
        <button class="btn-heart-convenient ${isLiked ? 'liked' : ''}" id="btn-player-heart" title="Save to Liked">
          ${Icons.heart(24, isLiked)}
        </button>
      </div>

      <!-- Controls Bar -->
      <div class="player-controls-bar">
        <button class="btn-ctrl" id="btn-player-repeat" title="Repeat Mode">
          ${Icons.repeat(20)}
        </button>

        <button class="btn-ctrl" id="btn-player-prev" title="Previous Track">
          ${Icons.skipBack(24)}
        </button>

        <button class="btn-play-pause-black" id="btn-player-play-pause" title="Play / Pause">
          ${audioEngine.isPlaying ? Icons.pause(26) : Icons.play(26)}
        </button>

        <button class="btn-ctrl" id="btn-player-next" title="Next Track">
          ${Icons.skipForward(24)}
        </button>

        <button class="btn-ctrl ${audioEngine.isShuffle ? 'active' : ''}" id="btn-player-shuffle" title="Shuffle">
          ${Icons.shuffle(20)}
        </button>
      </div>
    </div>
  `;

  // Query elements
  const orbitSvg = container.querySelector('#orbit-svg-element');
  const progressFill = container.querySelector('#orbit-progress-fill');
  const orbitDot = container.querySelector('#orbit-scrubber-dot');
  const timeDisplay = container.querySelector('#player-time-display');
  const coverImg = container.querySelector('#player-cover-image');
  const trackTitle = container.querySelector('#player-track-title');
  const artistName = container.querySelector('#player-artist-name');
  const playPauseBtn = container.querySelector('#btn-player-play-pause');
  const heartBtn = container.querySelector('#btn-player-heart');
  const repeatBtn = container.querySelector('#btn-player-repeat');
  const shuffleBtn = container.querySelector('#btn-player-shuffle');
  const lyricsBtn = container.querySelector('#btn-top-lyrics');

  // Setup circle dash array for progress stroke
  progressFill.style.strokeDasharray = circumference;
  progressFill.style.strokeDashoffset = circumference;

  let isSeeking = false;
  let wasPlayingBeforeSeek = false;
  let currentProgressRatio = 0;

  // Updates Scrubber position around circular orbit
  function updateCircleScrubber(progress) {
    currentProgressRatio = progress;
    const angle = progress * 2 * Math.PI - Math.PI / 2;
    const x = CX + R * Math.cos(angle);
    const y = CY + R * Math.sin(angle);

    orbitDot.setAttribute('cx', x.toFixed(2));
    orbitDot.setAttribute('cy', y.toFixed(2));

    const offset = circumference * (1 - Math.max(0, Math.min(progress, 1)));
    progressFill.style.strokeDashoffset = offset.toFixed(1);
  }

  // Audio Engine Time Updates
  audioEngine.subscribe('timeUpdate', ({ currentTime, duration, progress }) => {
    if (!isSeeking) {
      timeDisplay.innerHTML = `${formatTime(currentTime)} <span>|</span> ${formatTime(duration)}`;
      updateCircleScrubber(progress);
    }
  });

  audioEngine.subscribe('playStateChange', ({ isPlaying }) => {
    playPauseBtn.innerHTML = isPlaying ? Icons.pause(26) : Icons.play(26);
  });

  audioEngine.subscribe('loadingChange', ({ isLoading }) => {
    if (isLoading) {
      timeDisplay.innerHTML = `LOADING <span>|</span> FETCHING STREAM`;
      playPauseBtn.innerHTML = `<div class="melo-btn-spinner"></div>`;
    } else {
      playPauseBtn.innerHTML = audioEngine.isPlaying ? Icons.pause(26) : Icons.play(26);
      timeDisplay.innerHTML = `${formatTime(audioEngine.currentTime)} <span>|</span> ${formatTime(audioEngine.duration)}`;
    }
  });

  audioEngine.subscribe('trackChange', (track) => {
    trackTitle.textContent = track.title;
    artistName.textContent = track.artist;
    coverImg.src = track.cover || DEFAULT_FALLBACK_COVER;
    const isNowLiked = Storage.isSongLiked(track.id);
    heartBtn.className = `btn-heart-convenient ${isNowLiked ? 'liked' : ''}`;
    heartBtn.innerHTML = Icons.heart(24, isNowLiked);
  });

  // Calculate circular angle from pointer
  function calculateAngleProgress(e) {
    const rect = orbitSvg.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - (rect.left + rect.width / 2);
    const y = clientY - (rect.top + rect.height / 2);
    let angle = Math.atan2(y, x) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;
    return angle / (Math.PI * 2);
  }

  // User requested: When holding/moving scrubber, pause audio until released
  function startSeeking(e) {
    isSeeking = true;
    wasPlayingBeforeSeek = audioEngine.isPlaying;
    if (wasPlayingBeforeSeek) {
      audioEngine.pause();
    }

    orbitDot.setAttribute('r', '7.5');
    const prog = calculateAngleProgress(e);
    updateCircleScrubber(prog);
    const targetSec = prog * (audioEngine.duration || currentTrack?.duration || 0);
    timeDisplay.innerHTML = `${formatTime(targetSec)} <span>|</span> ${formatTime(audioEngine.duration || currentTrack?.duration || 0)}`;
  }

  function moveSeeking(e) {
    if (!isSeeking) return;
    const prog = calculateAngleProgress(e);
    updateCircleScrubber(prog);
    const targetSec = prog * (audioEngine.duration || currentTrack?.duration || 0);
    timeDisplay.innerHTML = `${formatTime(targetSec)} <span>|</span> ${formatTime(audioEngine.duration || currentTrack?.duration || 0)}`;
  }

  function endSeeking() {
    if (!isSeeking) return;
    isSeeking = false;
    orbitDot.setAttribute('r', '5');
    audioEngine.seekRatio(currentProgressRatio);

    // Resume playback if it was playing before seeking
    if (wasPlayingBeforeSeek) {
      audioEngine.play();
      wasPlayingBeforeSeek = false;
    }
  }

  orbitSvg.addEventListener('mousedown', startSeeking);
  window.addEventListener('mousemove', moveSeeking);
  window.addEventListener('mouseup', endSeeking);

  orbitSvg.addEventListener('touchstart', startSeeking, { passive: true });
  window.addEventListener('touchmove', moveSeeking, { passive: true });
  window.addEventListener('touchend', endSeeking);

  // Playback Controls
  playPauseBtn.addEventListener('click', () => audioEngine.togglePlay());
  container.querySelector('#btn-player-next').addEventListener('click', () => audioEngine.next());
  container.querySelector('#btn-player-prev').addEventListener('click', () => audioEngine.prev());

  repeatBtn.addEventListener('click', () => {
    const mode = audioEngine.toggleRepeat();
    repeatBtn.innerHTML = mode === 'one' ? Icons.repeatOne(20) : Icons.repeat(20);
    repeatBtn.classList.toggle('active', mode !== 'off');
  });

  shuffleBtn.addEventListener('click', () => {
    const isShuffle = audioEngine.toggleShuffle();
    shuffleBtn.classList.toggle('active', isShuffle);
  });

  // Convenient Like Button
  heartBtn.addEventListener('click', async () => {
    if (!audioEngine.currentTrack) return;
    const liked = await Storage.toggleLikeSong(audioEngine.currentTrack);
    heartBtn.classList.toggle('liked', liked);
    heartBtn.innerHTML = Icons.heart(24, liked);
  });

  // Navigation, Equalizer, Queue & Lyrics triggers
  container.querySelector('#btn-player-back').addEventListener('click', onBack);
  container.querySelector('#btn-player-equalizer')?.addEventListener('click', () => {
    if (onOpenEqualizer) onOpenEqualizer();
  });
  lyricsBtn.addEventListener('click', onOpenLyrics);
  const queueBtn = container.querySelector('#btn-player-queue');
  queueBtn?.addEventListener('click', () => {
    if (onOpenQueue) onOpenQueue();
  });
}

function formatTime(sec) {
  if (isNaN(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
