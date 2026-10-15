// UI: Dedicated Mix / Playlist Detail View (25-30 Songs per Mix) with Smooth Loading Shimmer
import { Icons } from './icons.js';
import { Storage } from '../services/storage.js';
import { DEFAULT_FALLBACK_COVER } from '../data/samples.js';

export function renderPlaylistView(container, { playlist, audioEngine, onBack }) {
  const tracks = playlist.tracks || [];
  let isLoading = true;

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '3:20';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function calculateTotalDuration(trackList) {
    const totalSecs = trackList.reduce((acc, t) => acc + (t.duration || 200), 0);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    if (hours > 0) {
      return `${hours} hr ${mins} min`;
    }
    return `${mins} min`;
  }

  function renderSkeleton() {
    return `
      <div class="view view-playlist active" id="view-playlist">
        <!-- Top Navigation -->
        <div class="playlist-top-bar">
          <button class="btn-circle-nav" id="btn-playlist-back" title="Go Back">
            ${Icons.chevronLeft(20)}
          </button>
          <span class="playlist-header-nav-title">Mix Playlist</span>
          <button class="btn-circle-nav" id="btn-playlist-share" title="Share Mix">
            ${Icons.share(18)}
          </button>
        </div>

        <!-- Scrollable Skeleton Content -->
        <div class="playlist-scroll-content">
          <!-- Hero Skeleton -->
          <div class="playlist-skeleton-hero">
            <div class="playlist-skeleton-cover melo-skeleton"></div>
            <div class="playlist-skeleton-bar melo-skeleton" style="width: 80px; height: 18px; border-radius: 10px; margin-top: 4px;"></div>
            <div class="playlist-skeleton-bar melo-skeleton" style="width: 220px; height: 28px; border-radius: 14px;"></div>
            <div class="playlist-skeleton-bar melo-skeleton" style="width: 260px; height: 14px; border-radius: 7px;"></div>
            <div class="playlist-skeleton-bar melo-skeleton" style="width: 140px; height: 12px; border-radius: 6px;"></div>

            <!-- Action Pills Placeholder -->
            <div class="playlist-hero-actions" style="margin-top: 6px;">
              <div class="melo-skeleton" style="flex: 1; height: 48px; border-radius: 24px;"></div>
              <div class="melo-skeleton" style="width: 48px; height: 48px; border-radius: 50%;"></div>
            </div>
          </div>

          <!-- Skeleton Track Rows -->
          <div class="playlist-track-list">
            <div class="playlist-section-label">CURATING TRACKS...</div>
            ${Array.from({ length: 7 }).map(() => `
              <div class="playlist-skeleton-row">
                <div class="melo-skeleton" style="width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;"></div>
                <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
                  <div class="melo-skeleton" style="width: 65%; height: 13px;"></div>
                  <div class="melo-skeleton" style="width: 40%; height: 11px;"></div>
                </div>
                <div class="melo-skeleton" style="width: 30px; height: 12px;"></div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderFullContent() {
    const isPlaying = audioEngine.isPlaying;
    const currentTrackId = audioEngine.currentTrack?.id;

    return `
      <div class="view view-playlist active" id="view-playlist">
        <!-- Top Navigation -->
        <div class="playlist-top-bar">
          <button class="btn-circle-nav" id="btn-playlist-back" title="Go Back">
            ${Icons.chevronLeft(20)}
          </button>
          <span class="playlist-header-nav-title">Mix Playlist</span>
          <button class="btn-circle-nav" id="btn-playlist-share" title="Share Mix">
            ${Icons.share(18)}
          </button>
        </div>

        <!-- Scrollable Playlist Content -->
        <div class="playlist-scroll-content playlist-content-fade">
          <!-- Hero Header -->
          <div class="playlist-hero-card">
            <div class="playlist-cover-scalloped" style="clip-path: url(#flower-mask-artist);">
              <img src="${playlist.cover || DEFAULT_FALLBACK_COVER}" alt="${playlist.title}" class="playlist-cover-img" />
            </div>

            <div class="playlist-hero-meta">
              <span class="playlist-badge">Curated Mix</span>
              <h1 class="playlist-hero-title">${playlist.title}</h1>
              <p class="playlist-hero-desc">${playlist.description || 'Curated personalized playlist tuned to your sound profile.'}</p>
              <span class="playlist-stats">${tracks.length} songs • ${calculateTotalDuration(tracks)}</span>
            </div>

            <!-- Actions: Play All & Shuffle -->
            <div class="playlist-hero-actions">
              <button class="btn-black-pill btn-playlist-play-all" id="btn-playlist-play-all">
                ${Icons.play(18)}
                <span>Play All</span>
              </button>
              <button class="btn-circle-nav btn-playlist-shuffle" id="btn-playlist-shuffle" title="Shuffle Play">
                ${Icons.shuffle(20)}
              </button>
            </div>
          </div>

          <!-- Track List (25 - 30 Tracks) -->
          <div class="playlist-track-list">
            <div class="playlist-section-label">TRACKS (${tracks.length})</div>
            ${tracks.map((track, i) => {
              const isCurrent = track.id === currentTrackId;
              const isLiked = Storage.isSongLiked(track.id);
              return `
                <div class="playlist-track-row ${isCurrent ? 'playing' : ''}" data-track-id="${track.id}" data-index="${i}">
                  <div class="track-row-left">
                    <span class="track-index">${isCurrent && isPlaying ? `
                      <div class="mini-eq-bars">
                        <span></span><span></span><span></span>
                      </div>
                    ` : (i + 1)}</span>
                    <img src="${track.cover || DEFAULT_FALLBACK_COVER}" alt="${track.title}" class="track-row-thumb" />
                    <div class="track-row-details">
                      <span class="track-row-title ${isCurrent ? 'active' : ''}">${track.title}</span>
                      <span class="track-row-artist">${track.artist}</span>
                    </div>
                  </div>

                  <div class="track-row-right">
                    <button class="btn-row-heart ${isLiked ? 'liked' : ''}" data-like-id="${track.id}" title="Save to Liked">
                      ${Icons.heart(16, isLiked)}
                    </button>
                    <span class="track-row-duration">${formatTime(track.duration)}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function attachFullEvents() {
    container.querySelector('#btn-playlist-back')?.addEventListener('click', onBack);

    // Play All
    container.querySelector('#btn-playlist-play-all')?.addEventListener('click', () => {
      if (tracks.length > 0) {
        audioEngine.isShuffle = false;
        audioEngine.setQueue(tracks, 0, true);
      }
    });

    // Shuffle Play
    container.querySelector('#btn-playlist-shuffle')?.addEventListener('click', () => {
      if (tracks.length > 0) {
        audioEngine.isShuffle = true;
        const randIdx = Math.floor(Math.random() * tracks.length);
        audioEngine.setQueue(tracks, randIdx, true);
      }
    });

    // Individual Track Clicks
    container.querySelectorAll('.playlist-track-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.btn-row-heart')) return;
        const index = parseInt(row.dataset.index, 10);
        if (!isNaN(index) && tracks[index]) {
          audioEngine.setQueue(tracks, index, true);
        }
      });
    });

    // Like Song Click
    container.querySelectorAll('.btn-row-heart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const trackId = btn.dataset.likeId;
        const track = tracks.find(t => t.id === trackId);
        if (track) {
          const liked = Storage.toggleLikeSong(track);
          btn.classList.toggle('liked', liked);
          btn.innerHTML = Icons.heart(16, liked);
        }
      });
    });

    // Share
    container.querySelector('#btn-playlist-share')?.addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({
          title: playlist.title,
          text: `Listen to ${playlist.title} on Melo`,
          url: window.location.href
        }).catch(() => {});
      } else {
        alert(`Copied link to ${playlist.title}`);
      }
    });
  }

  // Initial render: show loading skeleton first
  container.innerHTML = renderSkeleton();
  container.querySelector('#btn-playlist-back')?.addEventListener('click', onBack);

  // Transition after a brief load (420ms) to display the full curated mix
  setTimeout(() => {
    isLoading = false;
    container.innerHTML = renderFullContent();
    attachFullEvents();
  }, 420);
}
