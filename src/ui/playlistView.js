// UI: Dedicated Mix & Custom Playlist Detail View with In-Page Search & Add Songs Drawer
import { Icons } from './icons.js';
import { Storage } from '../services/storage.js';
import { DEFAULT_FALLBACK_COVER, SAMPLE_TRACKS } from '../data/samples.js';
import { musicSearchService } from '../services/musicSearchService.js';

export function renderPlaylistView(container, { playlist, audioEngine, onBack }) {
  let tracks = [...(playlist.tracks || [])];
  let isCustomPlaylist = playlist.id && playlist.id.startsWith('playlist-');
  let isAddSheetOpen = false;
  let searchDebounce = null;
  let currentAddResults = [...SAMPLE_TRACKS];
  let isSearchingAdd = false;

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

  function renderTrackRowsHtml() {
    const isPlaying = audioEngine.isPlaying;
    const currentTrackId = audioEngine.currentTrack?.id;

    if (tracks.length === 0) {
      return `
        <div class="playlist-empty-card" style="text-align: center; padding: 44px 20px; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 12px; background: rgba(0,0,0,0.02); border-radius: 24px; margin: 8px 0; border: 1.5px dashed rgba(0,0,0,0.1);">
          <div class="btn-circle-nav" style="width: 52px; height: 52px; background: #FFFFFF; box-shadow: 0 4px 16px rgba(0,0,0,0.08); color: var(--accent-black);">
            ${Icons.plus(22)}
          </div>
          <div>
            <h3 style="font-weight: 800; font-size: 15px; color: var(--text-primary); margin-bottom: 4px;">This playlist is currently empty</h3>
            <p style="font-size: 12px; color: var(--text-secondary); max-width: 250px; line-height: 1.45;">Search for any song worldwide to add directly to "${playlist.title}".</p>
          </div>
          <button class="btn-black-pill" id="btn-trigger-add-modal" style="margin-top: 4px;">
            ${Icons.plus(16)}
            <span>Add Songs Now</span>
          </button>
        </div>
      `;
    }

    return tracks.map((track, i) => {
      const isCurrent = track.id === currentTrackId;
      const isLiked = Storage.isSongLiked(track.id);
      const isDownloaded = track.isDownloaded === true;

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
              <span class="track-row-artist">
                ${track.artist}
                ${playlist.id === 'playlist-liked-songs' ? `
                  • <span class="download-status-badge ${isDownloaded ? 'downloaded' : 'downloading'}" id="pl-download-badge-${track.id}">
                    ${isDownloaded ? '✓ Offline Ready' : '<div class="melo-mini-spinner"></div> Downloading...'}
                  </span>
                ` : ''}
              </span>
            </div>
          </div>

          <div class="track-row-right">
            <button class="btn-row-heart ${isLiked ? 'liked' : ''}" data-like-id="${track.id}" title="Save to Liked">
              ${Icons.heart(16, isLiked)}
            </button>
            ${isCustomPlaylist ? `
              <button class="btn-circle-nav btn-remove-playlist-track" data-track-id="${track.id}" title="Remove from playlist" style="width: 30px; height: 30px; opacity: 0.6;">
                ${Icons.close(14)}
              </button>
            ` : ''}
            <span class="track-row-duration">${formatTime(track.duration)}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderAddSearchResults(list) {
    if (isSearchingAdd) {
      return `
        <div style="padding: 20px 0; display: flex; flex-direction: column; gap: 8px;">
          <div class="melo-skeleton" style="height: 48px; border-radius: 14px;"></div>
          <div class="melo-skeleton" style="height: 48px; border-radius: 14px;"></div>
          <div class="melo-skeleton" style="height: 48px; border-radius: 14px;"></div>
        </div>
      `;
    }

    if (!list || list.length === 0) {
      return `
        <div style="text-align: center; padding: 28px 16px; color: var(--text-muted); font-size: 13px;">
          No matching songs found. Try a different title or artist name.
        </div>
      `;
    }

    return list.map(t => {
      const alreadyIn = tracks.some(existing => existing.id === t.id || (existing.title.toLowerCase() === t.title.toLowerCase() && existing.artist.toLowerCase() === t.artist.toLowerCase()));
      return `
        <div class="track-row-item" style="padding: 10px 12px; background: rgba(0,0,0,0.02); border-radius: 16px; margin-bottom: 6px;">
          <div class="track-row-left">
            <img class="track-row-thumb" src="${t.cover || DEFAULT_FALLBACK_COVER}" alt="${t.title}" style="width: 40px; height: 40px; border-radius: 10px;" />
            <div class="track-row-info">
              <span class="track-row-title" style="font-size: 13.5px;">${t.title}</span>
              <span class="track-row-artist" style="font-size: 11.5px;">${t.artist}</span>
            </div>
          </div>
          <div class="track-row-right">
            <button class="btn-black-pill btn-add-song-to-pl ${alreadyIn ? 'added' : ''}" data-track-id="${t.id}" style="padding: 7px 14px; font-size: 11.5px; ${alreadyIn ? 'background: #2E7D32; color: #FFF;' : ''}">
              ${alreadyIn ? '✓ Added' : '+ Add'}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderFullContent() {
    return `
      <div class="view view-playlist active" id="view-playlist">
        <!-- Top Navigation -->
        <div class="playlist-top-bar">
          <button class="btn-circle-nav" id="btn-playlist-back" title="Go Back">
            ${Icons.chevronLeft(20)}
          </button>
          <span class="playlist-header-nav-title">${playlist.title}</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="btn-circle-nav" id="btn-top-add-songs" title="Add Songs to Playlist" style="width: 38px; height: 38px;">
              ${Icons.plus(18)}
            </button>
            <button class="btn-circle-nav" id="btn-playlist-share" title="Share Mix">
              ${Icons.share(18)}
            </button>
          </div>
        </div>

        <!-- Scrollable Playlist Content -->
        <div class="playlist-scroll-content playlist-content-fade">
          <!-- Hero Header -->
          <div class="playlist-hero-card">
            <div class="playlist-cover-scalloped" style="clip-path: url(#flower-mask-artist);">
              ${(tracks.length > 0 && tracks[0]?.cover) || playlist.cover ? `
                <img src="${tracks[0]?.cover || playlist.cover}" alt="${playlist.title}" class="playlist-cover-img" id="playlist-hero-cover-img" />
              ` : `
                <div class="playlist-hero-folder-empty" id="playlist-hero-folder-icon">
                  ${Icons.folderMusic(52)}
                </div>
              `}
            </div>

            <div class="playlist-hero-meta">
              <span class="playlist-badge">${isCustomPlaylist ? 'Personal Playlist' : 'Curated Mix'}</span>
              <h1 class="playlist-hero-title">${playlist.title}</h1>
              <p class="playlist-hero-desc">${playlist.description || 'Curated personalized playlist tuned to your sound profile.'}</p>
              <span class="playlist-stats" id="playlist-stats-label">${tracks.length} songs • ${calculateTotalDuration(tracks)}</span>
            </div>

            <!-- Actions: Play All, Shuffle & Add Songs -->
            <div class="playlist-hero-actions">
              <button class="btn-black-pill btn-playlist-play-all" id="btn-playlist-play-all">
                ${Icons.play(18)}
                <span>Play All</span>
              </button>
              <button class="btn-circle-nav btn-playlist-shuffle" id="btn-playlist-shuffle" title="Shuffle Play">
                ${Icons.shuffle(20)}
              </button>
              <button class="btn-circle-nav" id="btn-hero-add-songs" title="Add Songs to Playlist" style="background: rgba(0,0,0,0.06);">
                ${Icons.plus(20)}
              </button>
            </div>
          </div>

          <!-- Track List Container -->
          <div class="playlist-track-list">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div class="playlist-section-label" id="playlist-section-heading">TRACKS (${tracks.length})</div>
              <button class="btn-circle-nav" id="btn-inline-add-songs" title="Add Songs" style="width: 30px; height: 30px;">
                ${Icons.plus(16)}
              </button>
            </div>
            <div id="playlist-track-rows-wrapper">
              ${renderTrackRowsHtml()}
            </div>
          </div>
        </div>

        <!-- Add Songs Bottom Sheet Modal (Fixed 50vh half-screen bottom modal) -->
        <div class="auth-modal-sheet ${isAddSheetOpen ? 'open' : ''}" id="playlist-add-sheet">
          <div class="auth-modal-card playlist-add-modal-card">
            <div class="auth-modal-header">
              <div>
                <h3 class="auth-modal-title" style="font-size: 18px;">Add Songs to Playlist</h3>
                <p style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">Search any song on YouTube/worldwide catalog</p>
              </div>
              <button class="btn-circle-nav" id="btn-close-add-sheet" title="Close">
                ${Icons.close(18)}
              </button>
            </div>

            <!-- Search input wrap -->
            <div class="search-input-wrap modal-fixed-search-wrap" style="padding: 10px 14px;">
              ${Icons.search(16)}
              <input type="text" id="add-song-search-input" placeholder="Search track or artist name..." autocomplete="off" />
            </div>

            <!-- Live Search Results List (Scrollable inside half-screen modal) -->
            <div id="add-song-results-container" class="modal-scrollable-list">
              ${renderAddSearchResults(currentAddResults)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function updatePlaylistMetaDisplay() {
    const statsEl = container.querySelector('#playlist-stats-label');
    const headingEl = container.querySelector('#playlist-section-heading');
    const coverWrap = container.querySelector('.playlist-cover-scalloped');

    if (statsEl) statsEl.textContent = `${tracks.length} songs • ${calculateTotalDuration(tracks)}`;
    if (headingEl) headingEl.textContent = `TRACKS (${tracks.length})`;
    if (coverWrap) {
      if (tracks.length > 0 && tracks[0].cover) {
        coverWrap.innerHTML = `<img src="${tracks[0].cover}" alt="${playlist.title}" class="playlist-cover-img" id="playlist-hero-cover-img" />`;
      } else if (!playlist.cover) {
        coverWrap.innerHTML = `<div class="playlist-hero-folder-empty" id="playlist-hero-folder-icon">${Icons.folderMusic(52)}</div>`;
      }
    }

    const rowsWrapper = container.querySelector('#playlist-track-rows-wrapper');
    if (rowsWrapper) {
      rowsWrapper.innerHTML = renderTrackRowsHtml();
      attachTrackEvents();
    }
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

    // Add Songs Sheet Triggers
    const sheet = container.querySelector('#playlist-add-sheet');
    const openAddSheet = () => {
      isAddSheetOpen = true;
      sheet?.classList.add('open');
      document.body.classList.add('sheet-modal-open');
      document.querySelector('.device-frame')?.classList.add('sheet-modal-open');
      document.querySelector('#mini-player-bar')?.classList.add('hidden');
      const bottomNav = document.querySelector('#floating-bottom-nav');
      if (bottomNav) bottomNav.style.display = 'none';
      const addInput = container.querySelector('#add-song-search-input');
      if (addInput) addInput.focus();
    };

    const closeAddSheet = () => {
      isAddSheetOpen = false;
      sheet?.classList.remove('open');
      document.body.classList.remove('sheet-modal-open');
      document.querySelector('.device-frame')?.classList.remove('sheet-modal-open');
      const playerContainer = document.querySelector('#player-container');
      const isPlayerExpanded = playerContainer?.classList.contains('player-expanded');
      if (audioEngine?.currentTrack && !isPlayerExpanded) {
        document.querySelector('#mini-player-bar')?.classList.remove('hidden');
        const bottomNav = document.querySelector('#floating-bottom-nav');
        if (bottomNav) bottomNav.style.display = 'flex';
      }
    };

    container.querySelector('#btn-top-add-songs')?.addEventListener('click', openAddSheet);
    container.querySelector('#btn-hero-add-songs')?.addEventListener('click', openAddSheet);
    container.querySelector('#btn-inline-add-songs')?.addEventListener('click', openAddSheet);
    container.querySelector('#btn-trigger-add-modal')?.addEventListener('click', openAddSheet);
    container.querySelector('#btn-close-add-sheet')?.addEventListener('click', closeAddSheet);
    sheet?.addEventListener('click', (e) => {
      if (e.target === sheet) closeAddSheet();
    });

    // Search inside Add Songs Sheet
    const addSearchInput = container.querySelector('#add-song-search-input');
    const addResultsContainer = container.querySelector('#add-song-results-container');

    addSearchInput?.addEventListener('input', (e) => {
      clearTimeout(searchDebounce);
      const q = e.target.value.trim();

      if (!q) {
        currentAddResults = [...SAMPLE_TRACKS];
        if (addResultsContainer) {
          addResultsContainer.innerHTML = renderAddSearchResults(currentAddResults);
          attachAddButtonEvents();
        }
        return;
      }

      isSearchingAdd = true;
      if (addResultsContainer) addResultsContainer.innerHTML = renderAddSearchResults([]);

      searchDebounce = setTimeout(async () => {
        const results = await musicSearchService.search(q);
        currentAddResults = results;
        isSearchingAdd = false;
        if (addResultsContainer) {
          addResultsContainer.innerHTML = renderAddSearchResults(results);
          attachAddButtonEvents();
        }
      }, 260);
    });

    attachTrackEvents();
    attachAddButtonEvents();
  }

  function attachTrackEvents() {
    // Individual Track Clicks
    container.querySelectorAll('.playlist-track-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.btn-row-heart') || e.target.closest('.btn-remove-playlist-track')) return;
        const index = parseInt(row.dataset.index, 10);
        if (!isNaN(index) && tracks[index]) {
          audioEngine.setQueue(tracks, index, true);
        }
      });
    });

    // Like Song Click
    container.querySelectorAll('.btn-row-heart').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const trackId = btn.dataset.likeId;
        const track = tracks.find(t => t.id === trackId);
        if (track) {
          const liked = await Storage.toggleLikeSong(track);
          btn.classList.toggle('liked', liked);
          btn.innerHTML = Icons.heart(16, liked);
        }
      });
    });

    // Remove Track from Playlist
    container.querySelectorAll('.btn-remove-playlist-track').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const trackId = btn.dataset.trackId;
        Storage.removeTrackFromPlaylist(playlist.id, trackId);
        tracks = tracks.filter(t => t.id !== trackId);
        playlist.tracks = tracks;
        updatePlaylistMetaDisplay();
      });
    });

    // Empty state Add Songs trigger
    container.querySelector('#btn-trigger-add-modal')?.addEventListener('click', openAddSheet);
  }

  function attachAddButtonEvents() {
    container.querySelectorAll('.btn-add-song-to-pl').forEach(btn => {
      btn.addEventListener('click', () => {
        const trackId = btn.dataset.trackId;
        const track = currentAddResults.find(t => t.id === trackId);
        if (!track) return;

        const added = Storage.addTrackToPlaylist(playlist.id, track, playlist);
        if (added) {
          tracks.push(track);
          playlist.tracks = tracks;
          btn.classList.add('added');
          btn.style.background = '#2E7D32';
          btn.style.color = '#FFF';
          btn.textContent = '✓ Added';
          updatePlaylistMetaDisplay();
          const rowsWrap = container.querySelector('#playlist-track-rows-wrapper');
          if (rowsWrap) {
            rowsWrap.innerHTML = renderTrackRowsHtml();
            attachTrackEvents();
          }
        }
      });
    });
  }

  // Initial render: render full playlist content immediately with zero white screen delay
  container.innerHTML = renderFullContent();
  attachFullEvents();

  window.addEventListener('melo-download-complete', (e) => {
    const trackId = e.detail?.trackId;
    if (!trackId) return;
    const badge = container.querySelector(`#pl-download-badge-${trackId}`);
    if (badge) {
      badge.className = 'download-status-badge downloaded';
      badge.innerHTML = '✓ Offline Ready';
    }
  });
}
