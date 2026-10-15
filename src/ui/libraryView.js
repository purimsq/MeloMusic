// View 6: Library (Liked Songs Auto-Downloaded, Custom Playlists & Local Device Audio Scanner)
import { Icons } from './icons.js';
import { Storage } from '../services/storage.js';
import { DEFAULT_FALLBACK_COVER, SAMPLE_TRACKS } from '../data/samples.js';

export function renderLibraryView(container, { audioEngine, onSelectTrack, onOpenPlaylist }) {
  let activeTab = 'liked'; // 'liked' | 'playlists' | 'device'
  let librarySearch = '';
  let deviceTracksCache = [];
  let isScanningDevice = false;

  function formatTime(sec) {
    if (isNaN(sec) || sec <= 0) return '03:20';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  const openPopup = () => {
    const popup = container.querySelector('#create-playlist-popup');
    const titleInput = container.querySelector('#new-playlist-title');
    const descInput = container.querySelector('#new-playlist-desc');
    if (popup) {
      popup.classList.add('open');
      document.body.classList.add('sheet-modal-open');
      document.querySelector('.device-frame')?.classList.add('sheet-modal-open');
      document.querySelector('#mini-player-bar')?.classList.add('hidden');
      const bottomNav = document.querySelector('#floating-bottom-nav');
      if (bottomNav) bottomNav.style.display = 'none';
      if (titleInput) {
        titleInput.value = '';
        titleInput.focus();
      }
      if (descInput) descInput.value = '';
    }
  };

  const closePopup = () => {
    const popup = container.querySelector('#create-playlist-popup');
    popup?.classList.remove('open');
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

  // Load device tracks from IndexedDB
  Storage.getDeviceTracks().then(tracks => {
    deviceTracksCache = tracks || [];
    if (activeTab === 'device') {
      const body = container.querySelector('#lib-content-body');
      if (body) {
        body.innerHTML = renderTabContent();
        attachContentEvents();
      }
    }
  });

  function getAudioFileDuration(file) {
    return new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(file);
        const a = new Audio(url);
        a.addEventListener('loadedmetadata', () => {
          const d = Math.round(a.duration);
          URL.revokeObjectURL(url);
          resolve(d > 0 ? d : 210);
        });
        a.addEventListener('error', () => {
          URL.revokeObjectURL(url);
          resolve(210);
        });
        setTimeout(() => {
          resolve(210);
        }, 800);
      } catch (e) {
        resolve(210);
      }
    });
  }

  function buildHtml() {
    return `
      <div class="view view-library" id="view-library">
        <!-- Pinned Top Header Container (Does NOT scroll) -->
        <div class="library-fixed-header">
          <!-- Top Section Header -->
          <div class="home-section-header" style="margin-bottom: 0;">
            <div>
              <h2 class="section-title">Your Library</h2>
              <p class="section-subtitle">Synced with cloud & offline local storage</p>
            </div>
            <div id="lib-header-action-wrap">
              ${activeTab === 'playlists' ? `
                <button class="btn-circle-nav" id="btn-create-playlist-top" title="Create New Playlist" style="width: 38px; height: 38px;">
                  ${Icons.plus(18)}
                </button>
              ` : activeTab === 'device' ? `
                <label class="btn-circle-nav" title="Import Local Audio" style="cursor: pointer; width: 38px; height: 38px;">
                  <input type="file" id="device-audio-input" multiple accept="audio/*" style="display: none;" />
                  ${Icons.plus(18)}
                </label>
              ` : ''}
            </div>
          </div>

          <!-- Library Filter Tabs: Liked Songs | Playlists | Device Music -->
          <div class="library-tabs-bar">
            <button class="lib-tab-btn ${activeTab === 'liked' ? 'active' : ''}" data-tab="liked">Liked Songs</button>
            <button class="lib-tab-btn ${activeTab === 'playlists' ? 'active' : ''}" data-tab="playlists">Playlists</button>
            <button class="lib-tab-btn ${activeTab === 'device' ? 'active' : ''}" data-tab="device">Device Music</button>
          </div>

          <!-- Filter Search Bar -->
          <div class="search-input-wrap" style="padding: 10px 16px;">
            ${Icons.search(16)}
            <input type="text" id="lib-search-input" value="${librarySearch}" placeholder="Filter in your library..." autocomplete="off" />
          </div>
        </div>

        <!-- Tab Content Body (Independently scrollable for Liked, Playlists, and Device Songs) -->
        <div id="lib-content-body" class="library-content-scrollable">
          ${renderTabContent()}
        </div>

        <!-- Create Playlist Centered Card Popup Modal -->
        <div class="playlist-popup-backdrop" id="create-playlist-popup">
          <div class="playlist-popup-card">
            <div class="playlist-popup-header">
              <div class="playlist-popup-icon-badge">
                ${Icons.folderMusic(26)}
              </div>
              <button class="btn-circle-nav" id="btn-close-playlist-modal" title="Close" type="button">
                ${Icons.close(18)}
              </button>
            </div>
            <h3 class="playlist-popup-title">Create New Playlist</h3>
            <p class="playlist-popup-sub">Assemble your favorite songs & organize your personal sound universe.</p>
            <form id="form-create-playlist" class="playlist-popup-form">
              <input type="text" class="playlist-popup-input" id="new-playlist-title" placeholder="Playlist Name (e.g. Late Night Drives)" autocomplete="off" required />
              <input type="text" class="playlist-popup-input" id="new-playlist-desc" placeholder="Description (optional)" autocomplete="off" />
              <div class="playlist-popup-actions">
                <button type="button" class="btn-secondary-pill" id="btn-cancel-create-playlist">Cancel</button>
                <button type="submit" class="btn-black-pill" style="flex: 1;">Create & Open</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  function renderTabContent() {
    if (activeTab === 'liked') {
      const liked = Storage.getLikedSongs();
      const filtered = liked.filter(t =>
        t.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
        t.artist.toLowerCase().includes(librarySearch.toLowerCase())
      );

      if (filtered.length === 0) {
        return `
          <div style="text-align: center; padding: 48px 20px; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 10px;">
            ${Icons.heart(38)}
            <p style="font-weight: 700; font-size: 15px; color: var(--text-primary);">No liked songs yet</p>
            <span style="font-size: 12px; max-width: 260px;">Tap the heart on any song to save it and automatically download it for offline listening.</span>
          </div>
        `;
      }

      return `
        <div class="vertical-track-list">
          ${filtered.map(t => {
            const isPlaying = audioEngine?.currentTrack?.id === t.id && audioEngine?.isPlaying;
            const isDownloaded = t.isDownloaded === true;
            return `
              <div class="track-row-item ${audioEngine?.currentTrack?.id === t.id ? 'playing' : ''}" data-id="${t.id}">
                <div class="track-row-left">
                  <img class="track-row-thumb" src="${t.cover || DEFAULT_FALLBACK_COVER}" alt="${t.title}" />
                  <div class="track-row-info">
                    <span class="track-row-title">${t.title}</span>
                    <span class="track-row-artist">
                      ${t.artist} • 
                      <span class="download-status-badge ${isDownloaded ? 'downloaded' : 'downloading'}" id="download-badge-${t.id}">
                        ${isDownloaded ? '✓ Offline Ready' : '<div class="melo-mini-spinner"></div> Downloading...'}
                      </span>
                    </span>
                  </div>
                </div>

                <div class="track-row-right">
                  <button class="btn-circle-nav btn-device-download" data-id="${t.id}" title="Download MP3 to device" style="width: 32px; height: 32px;">
                    ${Icons.download(14)}
                  </button>
                  <button class="btn-circle-nav btn-lib-unlike liked" data-id="${t.id}" title="Remove from Liked" style="width: 32px; height: 32px;">
                    ${Icons.heart(14, true)}
                  </button>
                  <span class="track-duration-pill">${formatTime(t.duration)}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    if (activeTab === 'playlists') {
      const playlists = Storage.getPlaylists();
      const filtered = playlists.filter(p =>
        p.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(librarySearch.toLowerCase()))
      );

      return `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <!-- Create Playlist Button Card -->
          <div class="playlist-create-tile" id="btn-create-playlist-tile">
            <div class="btn-circle-nav" style="width: 44px; height: 44px; background: var(--accent-black); color: #FFF;">
              ${Icons.plus(22)}
            </div>
            <div>
              <span style="font-weight: 800; font-size: 14.5px; color: var(--text-primary);">Create New Playlist</span>
              <p style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">Assemble your favorite songs & organize your taste</p>
            </div>
          </div>

          <!-- Existing Playlists Grid -->
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${filtered.map(pl => `
              <div class="playlist-list-card" data-playlist-id="${pl.id}">
                <div class="playlist-card-thumb-wrap">
                  ${(pl.tracks && pl.tracks.length > 0 && pl.tracks[0].cover) ? `
                    <img src="${pl.tracks[0].cover}" alt="${pl.title}" class="playlist-card-thumb" />
                  ` : `
                    <div class="playlist-card-folder-icon">
                      ${Icons.folderMusic(24)}
                    </div>
                  `}
                </div>
                <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                  <span style="font-weight: 700; font-size: 14px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${pl.title}</span>
                  <span style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${(pl.tracks || []).length} songs • Custom Playlist</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <button class="btn-circle-nav btn-share-pl" data-id="${pl.id}" title="Share Playlist" style="width: 34px; height: 34px;">
                    ${Icons.share(16)}
                  </button>
                  <button class="btn-circle-nav btn-delete-pl" data-id="${pl.id}" title="Delete Playlist" style="width: 34px; height: 34px;">
                    ${Icons.trash(14)}
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (activeTab === 'device') {
      const list = Array.isArray(deviceTracksCache) ? deviceTracksCache : [];
      const q = (librarySearch || '').toLowerCase();
      const filtered = list.filter(t =>
        t && (
          ((t.title || '').toLowerCase().includes(q)) ||
          ((t.artist || '').toLowerCase().includes(q))
        )
      );

      return `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <!-- Scanning Progress Indicator -->
          ${isScanningDevice ? `
            <div style="background: var(--accent-black); color: #FFF; border-radius: 18px; padding: 14px 18px; display: flex; align-items: center; gap: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.12);">
              <div style="width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #FFF; border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0;"></div>
              <div style="display: flex; flex-direction: column;">
                <span style="font-size: 13px; font-weight: 700;">Scanning device storage...</span>
                <span style="font-size: 11px; opacity: 0.8;">Reading audio files and extracting metadata</span>
              </div>
            </div>
          ` : ''}

          <!-- Device Scanner Actions: Folder Permission Picker & File Multi-select -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="playlist-create-tile" id="btn-scan-music-folder" style="cursor: pointer; padding: 14px; flex-direction: column; align-items: flex-start; gap: 8px;">
              <div class="btn-circle-nav" style="width: 40px; height: 40px; background: var(--accent-black); color: #FFF;">
                ${Icons.download(18)}
              </div>
              <div>
                <span style="font-weight: 800; font-size: 13.5px; color: var(--text-primary); display: block;">Scan Folder</span>
                <p style="font-size: 10.5px; color: var(--text-secondary); margin-top: 2px;">Grant folder access</p>
              </div>
            </div>

            <label class="playlist-create-tile" style="cursor: pointer; padding: 14px; flex-direction: column; align-items: flex-start; gap: 8px;">
              <input type="file" id="device-audio-input-inner" multiple accept="audio/*" style="display: none;" />
              <div class="btn-circle-nav" style="width: 40px; height: 40px; background: rgba(0,0,0,0.06); color: var(--text-primary);">
                ${Icons.plus(18)}
              </div>
              <div>
                <span style="font-weight: 800; font-size: 13.5px; color: var(--text-primary); display: block;">Pick Audio</span>
                <p style="font-size: 10.5px; color: var(--text-secondary); margin-top: 2px;">Select individual files</p>
              </div>
            </label>
          </div>

          ${filtered.length === 0 ? `
            <div style="text-align: center; padding: 36px 20px; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 8px;">
              ${Icons.music(36)}
              <p style="font-weight: 700; font-size: 14px; color: var(--text-primary);">No local device tracks loaded</p>
              <span style="font-size: 12px; max-width: 250px;">Scan your phone's Music directory or select audio files to play them with zero internet.</span>
            </div>
          ` : `
            <div class="vertical-track-list">
              ${filtered.map(t => `
                <div class="track-row-item device-track-row" data-id="${t.id}">
                  <div class="track-row-left">
                    <img class="track-row-thumb" src="${t.cover || DEFAULT_FALLBACK_COVER}" alt="${t.title}" />
                    <div class="track-row-info">
                      <span class="track-row-title">${t.title}</span>
                      <span class="track-row-artist">${t.artist} • Local Device File</span>
                    </div>
                  </div>
                  <div class="track-row-right">
                    <span class="track-duration-pill">${formatTime(t.duration)}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;
    }
  }

  function attachEvents() {
    // Search filter
    const searchInput = container.querySelector('#lib-search-input');
    searchInput?.addEventListener('input', (e) => {
      librarySearch = e.target.value;
      const body = container.querySelector('#lib-content-body');
      if (body) {
        body.innerHTML = renderTabContent();
        attachContentEvents();
      }
    });

    // Audio Files processor
    const handleFiles = async (files) => {
      if (!files || files.length === 0) return;
      isScanningDevice = true;
      const body = container.querySelector('#lib-content-body');
      if (body) body.innerHTML = renderTabContent();

      for (const file of files) {
        let rawName = file.name.replace(/\.[^/.]+$/, '').trim();
        rawName = rawName.replace(/^\d+[\s.-]+/, '');
        let artist = 'Device Music';
        let title = rawName;

        if (rawName.includes(' - ')) {
          const parts = rawName.split(' - ');
          artist = parts[0].trim();
          title = parts.slice(1).join(' - ').trim();
        }

        const duration = await getAudioFileDuration(file);

        const trackInfo = {
          title: title.toUpperCase(),
          artist: artist,
          album: 'Phone Storage',
          duration: duration,
          cover: DEFAULT_FALLBACK_COVER
        };

        const saved = await Storage.saveDeviceTrack(trackInfo, file);
        if (saved) {
          deviceTracksCache.unshift(saved);
        }
      }

      isScanningDevice = false;
      activeTab = 'device';
      container.innerHTML = buildHtml();
      attachEvents();
    };

    // Scan Music Folder using File System Access API
    const scanMusicFolder = async () => {
      if ('showDirectoryPicker' in window) {
        try {
          const dirHandle = await window.showDirectoryPicker({
            id: 'melo_device_music',
            mode: 'read',
            startIn: 'music'
          });

          const foundFiles = [];
          async function scanDir(handle) {
            for await (const entry of handle.values()) {
              if (entry.kind === 'file') {
                const ext = entry.name.split('.').pop().toLowerCase();
                if (['mp3', 'm4a', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) {
                  try {
                    const f = await entry.getFile();
                    foundFiles.push(f);
                  } catch (e) {}
                }
              } else if (entry.kind === 'directory') {
                try {
                  await scanDir(entry);
                } catch (e) {}
              }
            }
          }

          isScanningDevice = true;
          const body = container.querySelector('#lib-content-body');
          if (body) body.innerHTML = renderTabContent();

          await scanDir(dirHandle);

          if (foundFiles.length > 0) {
            await handleFiles(foundFiles);
          } else {
            isScanningDevice = false;
            alert('No audio files found in the chosen directory.');
            container.innerHTML = buildHtml();
            attachEvents();
          }
          return;
        } catch (err) {
          isScanningDevice = false;
          if (err.name === 'AbortError') return;
          console.warn('showDirectoryPicker error:', err);
        }
      }

      // Universal fallback to file picker
      container.querySelector('#device-audio-input-inner')?.click();
    };

    container.querySelector('#btn-scan-music-folder')?.addEventListener('click', scanMusicFolder);

    container.querySelector('#device-audio-input')?.addEventListener('change', (e) => {
      if (e.target.files) handleFiles(Array.from(e.target.files));
    });
    container.querySelector('#device-audio-input-inner')?.addEventListener('change', (e) => {
      if (e.target.files) handleFiles(Array.from(e.target.files));
    });

    // Pop-up Card Modal controls
    const popup = container.querySelector('#create-playlist-popup');
    const titleInput = container.querySelector('#new-playlist-title');
    const descInput = container.querySelector('#new-playlist-desc');

    const openPopup = () => {
      if (popup) {
        popup.classList.add('open');
        document.body.classList.add('sheet-modal-open');
        document.querySelector('.device-frame')?.classList.add('sheet-modal-open');
        document.querySelector('#mini-player-bar')?.classList.add('hidden');
        const bottomNav = document.querySelector('#floating-bottom-nav');
        if (bottomNav) bottomNav.style.display = 'none';
        if (titleInput) {
          titleInput.value = '';
          titleInput.focus();
        }
        if (descInput) descInput.value = '';
      }
    };

    const closePopup = () => {
      popup?.classList.remove('open');
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

    function switchTab(tab) {
      activeTab = tab;
      container.querySelectorAll('.lib-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === activeTab);
      });

      const actionWrap = container.querySelector('#lib-header-action-wrap');
      if (actionWrap) {
        if (activeTab === 'playlists') {
          actionWrap.innerHTML = `
            <button class="btn-circle-nav" id="btn-create-playlist-top" title="Create New Playlist" style="width: 38px; height: 38px;">
              ${Icons.plus(18)}
            </button>
          `;
          actionWrap.querySelector('#btn-create-playlist-top')?.addEventListener('click', openPopup);
        } else if (activeTab === 'device') {
          actionWrap.innerHTML = `
            <label class="btn-circle-nav" title="Import Local Audio" style="cursor: pointer; width: 38px; height: 38px;">
              <input type="file" id="device-audio-input" multiple accept="audio/*" style="display: none;" />
              ${Icons.plus(18)}
            </label>
          `;
          actionWrap.querySelector('#device-audio-input')?.addEventListener('change', (e) => {
            if (e.target.files) handleFiles(Array.from(e.target.files));
          });
        } else {
          actionWrap.innerHTML = '';
        }
      }

      const body = container.querySelector('#lib-content-body');
      if (body) {
        body.innerHTML = renderTabContent();
        attachContentEvents();
      }
    }

    // Tab switching
    container.querySelectorAll('.lib-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        switchTab(btn.dataset.tab);
      });
    });

    container.querySelector('#btn-create-playlist-top')?.addEventListener('click', openPopup);
    container.querySelector('#btn-close-playlist-modal')?.addEventListener('click', closePopup);
    container.querySelector('#btn-cancel-create-playlist')?.addEventListener('click', closePopup);

    popup?.addEventListener('click', (e) => {
      if (e.target === popup) closePopup();
    });

    container.querySelector('#form-create-playlist')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = titleInput?.value.trim();
      const desc = descInput?.value.trim();
      if (!title) return;

      const newPl = Storage.createPlaylist(title, desc);
      closePopup();
      switchTab('playlists');

      // Immediately visit the created playlist detail page!
      if (newPl && onOpenPlaylist) {
        onOpenPlaylist(newPl);
      }
    });

    attachContentEvents();
  }

  function attachContentEvents() {
    // Liked Track clicks
    container.querySelectorAll('.track-row-item:not(.device-track-row)').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.btn-lib-unlike') || e.target.closest('.btn-device-download')) return;
        const trackId = row.dataset.id;
        const track = Storage.getLikedSongs().find(t => t.id === trackId);
        if (track) onSelectTrack(track);
      });
    });

    // Device Track clicks (plays local file blob)
    container.querySelectorAll('.device-track-row').forEach(row => {
      row.addEventListener('click', () => {
        const trackId = row.dataset.id;
        const track = deviceTracksCache.find(t => t.id === trackId);
        if (track) onSelectTrack(track);
      });
    });

    // Unlike
    container.querySelectorAll('.btn-lib-unlike').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const trackId = btn.dataset.id;
        const track = Storage.getLikedSongs().find(t => t.id === trackId);
        if (track) {
          await Storage.toggleLikeSong(track);
          container.querySelector('#lib-content-body').innerHTML = renderTabContent();
          attachContentEvents();
        }
      });
    });

    // Direct Device MP3 Download
    container.querySelectorAll('.btn-device-download').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const trackId = btn.dataset.id;
        const track = Storage.getLikedSongs().find(t => t.id === trackId);
        if (track) {
          btn.style.transform = 'scale(1.2)';
          await Storage.downloadTrackFileToDevice(track);
          setTimeout(() => btn.style.transform = 'none', 300);
        }
      });
    });

    // Playlist clicks -> open playlist view
    container.querySelectorAll('.playlist-list-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-share-pl') || e.target.closest('.btn-delete-pl')) return;
        const plId = card.dataset.playlistId;
        const pl = Storage.getPlaylists().find(p => p.id === plId);
        if (pl && onOpenPlaylist) {
          onOpenPlaylist(pl);
        }
      });
    });

    // Share playlist (Native phone share)
    container.querySelectorAll('.btn-share-pl').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const plId = btn.dataset.id;
        const pl = Storage.getPlaylists().find(p => p.id === plId);
        if (!pl) return;

        if (navigator.share) {
          navigator.share({
            title: pl.title,
            text: `Listen to ${pl.title} on Melo Music`,
            url: window.location.href
          }).catch(() => {});
        } else {
          navigator.clipboard?.writeText(window.location.href);
          alert(`Copied link to ${pl.title}`);
        }
      });
    });

      // Delete playlist
      container.querySelectorAll('.btn-delete-pl').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const plId = btn.dataset.id;
          if (confirm('Delete this playlist?')) {
            Storage.deletePlaylist(plId);
            container.querySelector('#lib-content-body').innerHTML = renderTabContent();
            attachContentEvents();
          }
        });
      });

      // Create playlist tile in list
      container.querySelector('#btn-create-playlist-tile')?.addEventListener('click', openPopup);
    }

  container.innerHTML = buildHtml();
  attachEvents();

  // Reactive listeners for background downloads & like state changes
  window.addEventListener('melo-download-complete', (e) => {
    const trackId = e.detail?.trackId;
    if (!trackId) return;
    const badge = container.querySelector(`#download-badge-${trackId}`);
    if (badge) {
      badge.className = 'download-status-badge downloaded';
      badge.innerHTML = '✓ Offline Ready';
    }
  });

  window.addEventListener('melo-liked-changed', () => {
    if (activeTab === 'liked') {
      const body = container.querySelector('#lib-content-body');
      if (body) {
        body.innerHTML = renderTabContent();
        attachContentEvents();
      }
    }
  });
}
