// View 5: Live Music Search (Worldwide Real Catalog + Offline Mode Restriction + Add to Playlist)
import { Icons } from './icons.js';
import { musicSearchService } from '../services/musicSearchService.js';
import { SAMPLE_TRACKS, DEFAULT_FALLBACK_COVER } from '../data/samples.js';
import { Storage } from '../services/storage.js';
import { networkService } from '../services/networkService.js';

export function renderSearchView(container, { audioEngine, onSelectTrack }) {
  let searchTimeout = null;
  let activeFilter = 'all'; // 'all' | 'tracks' | 'artists'
  let currentResults = [...SAMPLE_TRACKS];
  let isSearching = false;
  let isOnline = networkService.isOnline;
  let selectedTrackForPlaylist = null;

  function formatTime(sec) {
    if (isNaN(sec) || sec <= 0) return '03:20';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function getOfflineLibraryTracks() {
    const liked = Storage.getLikedSongs();
    return liked;
  }

  function buildHtml() {
    const isCurrentlyActive = container.querySelector('.view')?.classList.contains('active');
    return `
      <div class="view view-search ${isCurrentlyActive ? 'active' : ''}" id="view-search">
        <!-- Pinned Top Header & Search Input (Does NOT scroll) -->
        <div class="search-fixed-header">
          <div class="home-section-header" style="margin-bottom: 0;">
            <div>
              <h2 class="section-title">Search</h2>
              <p class="section-subtitle">${isOnline ? 'Real worldwide catalog & ad-free audio' : 'Offline Mode • Browsing downloaded vault'}</p>
            </div>
            <span class="section-badge" style="${isOnline ? '' : 'background: rgba(0,0,0,0.06); color: var(--text-secondary);'}">
              ${isOnline ? 'Worldwide' : 'Offline'}
            </span>
          </div>

          <!-- Offline Restriction Banner (Only shown when disconnected) -->
          ${!isOnline ? `
            <div class="search-offline-banner" style="background: rgba(0,0,0,0.03); border: 1.5px dashed rgba(0,0,0,0.12); border-radius: 18px; padding: 12px 16px; text-align: center;">
              <div class="btn-circle-nav" style="margin: 0 auto 6px; width: 34px; height: 34px; background: #FFFFFF; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                ${Icons.wifiOff(16)}
              </div>
              <h3 style="font-size: 13px; font-weight: 800; color: var(--text-primary); margin-bottom: 2px;">Offline Mode Active</h3>
              <p style="font-size: 11px; color: var(--text-secondary); max-width: 270px; margin: 0 auto; line-height: 1.4;">
                Online web search is paused while offline. You can search and listen to your downloaded Liked Songs.
              </p>
            </div>
          ` : ''}

          <!-- Fixed Search Input Bar -->
          <div class="search-input-wrap">
            ${Icons.search(20)}
            <input type="text" id="global-search-input" placeholder="${isOnline ? 'Search any song, artist, or album...' : 'Search in your downloaded songs...'}" autocomplete="off" />
            <button id="btn-clear-search" style="background: none; border: none; cursor: pointer; color: var(--text-muted); display: none;">
              ${Icons.close(18)}
            </button>
          </div>

          <!-- Category Filter Pills -->
          <div class="search-category-pills" style="display: flex; gap: 8px;">
            <button class="lib-tab-btn active search-cat-btn" data-filter="all">All</button>
            <button class="lib-tab-btn search-cat-btn" data-filter="tracks">Tracks</button>
            <button class="lib-tab-btn search-cat-btn" data-filter="artists">Artists</button>
          </div>
        </div>

        <!-- Search Results Area (Independently scrollable without moving search bar) -->
        <div class="vertical-track-list search-results-scrollable" id="search-results-list">
          ${renderResultsHtml(currentResults, audioEngine)}
        </div>

        <!-- Add to Playlist Picker Sheet (Fixed 50vh half-screen bottom modal) -->
        <div class="auth-modal-sheet" id="sheet-add-to-playlist">
          <div class="auth-modal-card playlist-add-modal-card">
            <div class="auth-modal-header">
              <div>
                <h3 class="auth-modal-title" style="font-size: 18px;">Add to Playlist</h3>
                <p id="add-to-playlist-track-name" style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">Select playlist to save this song</p>
              </div>
              <button class="btn-circle-nav" id="btn-close-playlist-picker" title="Close">
                ${Icons.close(18)}
              </button>
            </div>

            <!-- List of User's Playlists (Scrollable inside half-screen modal) -->
            <div id="playlist-picker-list" class="modal-scrollable-list">
              <!-- Populated dynamically -->
            </div>
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = buildHtml();

  function renderResultsHtml(tracks, engine) {
    if (isSearching) {
      return `
        <div style="display: flex; flex-direction: column; gap: 10px; padding: 10px 0;">
          <div class="melo-skeleton" style="height: 56px; border-radius: 18px;"></div>
          <div class="melo-skeleton" style="height: 56px; border-radius: 18px;"></div>
          <div class="melo-skeleton" style="height: 56px; border-radius: 18px;"></div>
          <div class="melo-skeleton" style="height: 56px; border-radius: 18px;"></div>
        </div>
      `;
    }

    if (!tracks || tracks.length === 0) {
      return `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 8px;">
          ${Icons.search(36)}
          <p style="font-weight: 600; font-size: 14px; color: var(--text-primary);">No tracks found</p>
          <span style="font-size: 12px;">${isOnline ? 'Try searching for a different artist name or song title' : 'No matching songs found in your offline downloads'}</span>
        </div>
      `;
    }

    const currentId = engine?.currentTrack?.id;

    return tracks.map(t => {
      const isPlaying = currentId === t.id && engine?.isPlaying;
      const isLiked = Storage.isSongLiked(t.id);

      return `
        <div class="track-row-item ${currentId === t.id ? 'playing' : ''} playlist-content-fade" data-id="${t.id}">
          <div class="track-row-left">
            <img class="track-row-thumb" src="${t.cover || DEFAULT_FALLBACK_COVER}" alt="${t.title}" loading="lazy" />
            <div class="track-row-info">
              <span class="track-row-title">${t.title}</span>
              <span class="track-row-artist">${t.artist}${t.album ? ` • ${t.album}` : ''}</span>
            </div>
          </div>

          <div class="track-row-right">
            <span class="track-duration-pill">${formatTime(t.duration)}</span>
            <button class="btn-circle-nav btn-row-like ${isLiked ? 'liked' : ''}" data-like-id="${t.id}" title="Like & Download" style="width: 34px; height: 34px;">
              ${Icons.heart(15, isLiked)}
            </button>
            <button class="btn-circle-nav btn-row-add-pl" data-id="${t.id}" title="Add to Playlist" style="width: 34px; height: 34px;">
              ${Icons.plus(15)}
            </button>
            <button class="btn-circle-nav btn-add-queue" title="Add to Queue" style="width: 34px; height: 34px;">
              ${Icons.queue(15)}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function attachEvents() {
    const input = container.querySelector('#global-search-input');
    const clearBtn = container.querySelector('#btn-clear-search');
    const resultsContainer = container.querySelector('#search-results-list');
    const catButtons = container.querySelectorAll('.search-cat-btn');

    // Filter Categories
    catButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        catButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        applyFilter();
      });
    });

    function applyFilter() {
      let filtered = [...currentResults];
      if (activeFilter === 'artists') {
        filtered = filtered.filter(t => t.genre || t.artist);
      }
      if (resultsContainer) {
        resultsContainer.innerHTML = renderResultsHtml(filtered, audioEngine);
        attachTrackEvents();
      }
    }

    // Live Real Search with Debounce & Offline Restriction
    input?.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';

      if (searchTimeout) clearTimeout(searchTimeout);

      if (!q) {
        currentResults = isOnline ? [...SAMPLE_TRACKS] : getOfflineLibraryTracks();
        if (resultsContainer) {
          resultsContainer.innerHTML = renderResultsHtml(currentResults, audioEngine);
          attachTrackEvents();
        }
        return;
      }

      // If offline: search local downloaded vault only
      if (!isOnline) {
        const offlinePool = getOfflineLibraryTracks();
        currentResults = offlinePool.filter(t =>
          t.title.toLowerCase().includes(q.toLowerCase()) ||
          t.artist.toLowerCase().includes(q.toLowerCase())
        );
        if (resultsContainer) {
          resultsContainer.innerHTML = renderResultsHtml(currentResults, audioEngine);
          attachTrackEvents();
        }
        return;
      }

      // Online: Show skeleton while searching real catalog
      isSearching = true;
      if (resultsContainer) resultsContainer.innerHTML = renderResultsHtml([], audioEngine);

      searchTimeout = setTimeout(async () => {
        const realResults = await musicSearchService.search(q);

        const localMatches = SAMPLE_TRACKS.filter(t =>
          t.title.toLowerCase().includes(q.toLowerCase()) ||
          t.artist.toLowerCase().includes(q.toLowerCase())
        );

        const combined = [...realResults];
        localMatches.forEach(lm => {
          if (!combined.some(c => c.title.toLowerCase() === lm.title.toLowerCase())) {
            combined.unshift(lm);
          }
        });

        currentResults = combined;
        isSearching = false;
        applyFilter();
      }, 280);
    });

    clearBtn?.addEventListener('click', () => {
      if (input) input.value = '';
      if (clearBtn) clearBtn.style.display = 'none';
      currentResults = isOnline ? [...SAMPLE_TRACKS] : getOfflineLibraryTracks();
      isSearching = false;
      if (resultsContainer) {
        resultsContainer.innerHTML = renderResultsHtml(currentResults, audioEngine);
        attachTrackEvents();
      }
    });

    // Add to Playlist Sheet
    const plSheet = container.querySelector('#sheet-add-to-playlist');
    const closePlSheet = () => {
      plSheet?.classList.remove('open');
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
    container.querySelector('#btn-close-playlist-picker')?.addEventListener('click', closePlSheet);
    plSheet?.addEventListener('click', (e) => {
      if (e.target === plSheet) closePlSheet();
    });

    attachTrackEvents();
  }

  function attachTrackEvents() {
    const resultsContainer = container.querySelector('#search-results-list');
    if (!resultsContainer) return;

    // Track clicks -> play & open player
    resultsContainer.querySelectorAll('.track-row-item').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.btn-row-like') || e.target.closest('.btn-add-queue') || e.target.closest('.btn-row-add-pl')) return;
        const trackId = row.dataset.id;
        const track = currentResults.find(t => t.id === trackId);
        if (!track) return;

        // Immediately load and play the clicked track
        if (audioEngine) {
          audioEngine.loadTrack(track, true);

          // Intelligently generate a curated Up Next queue (artist's other top hits + related suggestions)
          // rather than flooding the queue with duplicate query-matched search results!
          musicSearchService.getSmartQueueForTrack(track, SAMPLE_TRACKS).then(curatedQueue => {
            if (curatedQueue && curatedQueue.length > 1 && audioEngine.currentTrack?.id === track.id) {
              audioEngine.queue = curatedQueue;
              audioEngine.queueIndex = 0;
              audioEngine.notify('queueChange', { queue: audioEngine.queue, index: 0 });
            }
          }).catch(err => {
            console.warn('Smart queue generation fallback:', err);
          });
        }

        if (onSelectTrack && track) {
          onSelectTrack(track);
        }
      });
    });

    // Like & Auto-download button
    resultsContainer.querySelectorAll('.btn-row-like').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const trackId = btn.dataset.likeId;
        const track = currentResults.find(t => t.id === trackId);
        if (track) {
          const liked = await Storage.toggleLikeSong(track);
          btn.classList.toggle('liked', liked);
          btn.innerHTML = Icons.heart(15, liked);
        }
      });
    });

    // Add to Queue button
    resultsContainer.querySelectorAll('.btn-add-queue').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const row = btn.closest('.track-row-item');
        const trackId = row?.dataset.id;
        const track = currentResults.find(t => t.id === trackId);
        if (track && audioEngine) {
          audioEngine.addToQueue(track);
          btn.style.transform = 'scale(1.25)';
          btn.style.backgroundColor = 'var(--accent-black)';
          btn.style.color = '#FFFFFF';
          setTimeout(() => {
            btn.style.transform = 'none';
            btn.style.backgroundColor = '';
            btn.style.color = '';
          }, 320);
        }
      });
    });

    // Add to Playlist picker trigger
    resultsContainer.querySelectorAll('.btn-row-add-pl').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const trackId = btn.dataset.id;
        const track = currentResults.find(t => t.id === trackId);
        if (!track) return;

        selectedTrackForPlaylist = track;
        openPlaylistPicker(track);
      });
    });
  }

  function openPlaylistPicker(track) {
    const plSheet = container.querySelector('#sheet-add-to-playlist');
    const trackNameEl = container.querySelector('#add-to-playlist-track-name');
    const pickerList = container.querySelector('#playlist-picker-list');

    if (trackNameEl) trackNameEl.textContent = `Add "${track.title}" to:`;

    const playlists = Storage.getPlaylists();

    if (!playlists || playlists.length === 0) {
      if (pickerList) {
        pickerList.innerHTML = `
          <div style="text-align: center; padding: 24px 16px; color: var(--text-muted); font-size: 13px;">
            No playlists found. Create one in your Library tab first!
          </div>
        `;
      }
    } else {
      if (pickerList) {
        pickerList.innerHTML = playlists.map(pl => {
          const alreadyHas = (pl.tracks || []).some(t => t.id === track.id);
          return `
            <div class="playlist-list-card btn-pick-playlist-target" data-pl-id="${pl.id}" style="cursor: pointer; padding: 12px 14px;">
              <img src="${(pl.tracks && pl.tracks[0]?.cover) || DEFAULT_FALLBACK_COVER}" style="width: 42px; height: 42px; border-radius: 10px; object-fit: cover;" />
              <div style="flex: 1; display: flex; flex-direction: column;">
                <span style="font-weight: 700; font-size: 13.5px; color: var(--text-primary);">${pl.title}</span>
                <span style="font-size: 11.5px; color: var(--text-secondary);">${(pl.tracks || []).length} songs</span>
              </div>
              <button class="btn-black-pill" style="padding: 6px 12px; font-size: 11.5px; ${alreadyHas ? 'background: #2E7D32;' : ''}">
                ${alreadyHas ? '✓ In Playlist' : '+ Add'}
              </button>
            </div>
          `;
        }).join('');

        pickerList.querySelectorAll('.btn-pick-playlist-target').forEach(card => {
          card.addEventListener('click', () => {
            const plId = card.dataset.plId;
            Storage.addTrackToPlaylist(plId, track);
            const btn = card.querySelector('button');
            if (btn) {
              btn.textContent = '✓ Added';
              btn.style.background = '#2E7D32';
            }
            setTimeout(() => {
              closePlSheet();
            }, 500);
          });
        });
      }
    }

    plSheet?.classList.add('open');
    document.body.classList.add('sheet-modal-open');
    document.querySelector('.device-frame')?.classList.add('sheet-modal-open');
    document.querySelector('#mini-player-bar')?.classList.add('hidden');
    const bottomNav = document.querySelector('#floating-bottom-nav');
    if (bottomNav) bottomNav.style.display = 'none';
  }

  // Network state subscriber
  networkService.subscribe(({ isOnline: online }) => {
    isOnline = online;
    if (!isOnline) {
      currentResults = getOfflineLibraryTracks();
    }
  });

  attachEvents();
}
