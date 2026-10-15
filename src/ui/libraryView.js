// View 6: Library & Offline Vault
import { Icons } from './icons.js';
import { Storage } from '../services/storage.js';
import { DEFAULT_FALLBACK_COVER, SAMPLE_TRACKS } from '../data/samples.js';

export function renderLibraryView(container, { audioEngine, onSelectTrack }) {
  let activeTab = 'liked'; // 'liked' | 'vault' | 'device'
  let librarySearch = '';

  function getTracksForTab() {
    if (activeTab === 'liked') {
      const liked = Storage.getLikedSongs();
      return liked.length > 0 ? liked : SAMPLE_TRACKS.slice(0, 2);
    }
    if (activeTab === 'vault') {
      return Storage.getLikedSongs();
    }
    return []; // device music
  }

  function buildHtml() {
    const tracks = getTracksForTab();
    const filtered = tracks.filter(t => 
      t.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
      t.artist.toLowerCase().includes(librarySearch.toLowerCase())
    );

    return `
      <div class="view view-library" id="view-library">
        <div class="home-section-header" style="margin-bottom: 0;">
          <h2 class="section-title">Your Library</h2>
          <label class="btn-circle-nav" title="Import from Device" style="cursor: pointer; width: 36px; height: 36px;">
            <input type="file" id="device-audio-input" multiple accept="audio/*" style="display: none;" />
            ${Icons.download(16)}
          </label>
        </div>

        <!-- Library Filter Tabs -->
        <div class="library-tabs-bar">
          <button class="lib-tab-btn ${activeTab === 'liked' ? 'active' : ''}" data-tab="liked">Liked Songs</button>
          <button class="lib-tab-btn ${activeTab === 'vault' ? 'active' : ''}" data-tab="vault">Offline Vault</button>
          <button class="lib-tab-btn ${activeTab === 'device' ? 'active' : ''}" data-tab="device">Device Music</button>
        </div>

        <!-- Search bar inside Library (Requested by user) -->
        <div class="search-input-wrap" style="padding: 10px 16px;">
          ${Icons.search(16)}
          <input type="text" id="lib-search-input" value="${librarySearch}" placeholder="Filter in library..." autocomplete="off" />
        </div>

        <!-- Track List -->
        <div class="vertical-track-list" id="lib-track-list">
          ${renderLibraryTracks(filtered, activeTab)}
        </div>
      </div>
    `;
  }

  container.innerHTML = buildHtml();
  attachEvents();

  function attachEvents() {
    // Tabs
    container.querySelectorAll('.lib-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        container.innerHTML = buildHtml();
        attachEvents();
      });
    });

    // Search filter in library
    const searchInput = container.querySelector('#lib-search-input');
    searchInput.addEventListener('input', (e) => {
      librarySearch = e.target.value;
      const listEl = container.querySelector('#lib-track-list');
      const tracks = getTracksForTab();
      const filtered = tracks.filter(t => 
        t.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
        t.artist.toLowerCase().includes(librarySearch.toLowerCase())
      );
      listEl.innerHTML = renderLibraryTracks(filtered, activeTab);
      attachRowEvents();
    });

    // Import audio files from device
    const fileInput = container.querySelector('#device-audio-input');
    if (fileInput) {
      fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        for (const file of files) {
          const track = {
            id: `device-${Date.now()}-${file.name}`,
            title: file.name.replace(/\.[^/.]+$/, '').toUpperCase(),
            artist: 'Local Device Audio',
            duration: 180,
            cover: DEFAULT_FALLBACK_COVER,
            audioUrl: URL.createObjectURL(file)
          };
          Storage.toggleLikeSong(track);
        }
        activeTab = 'device';
        container.innerHTML = buildHtml();
        attachEvents();
      });
    }

    attachRowEvents();
  }

  function attachRowEvents() {
    container.querySelectorAll('.track-row-item').forEach(row => {
      row.addEventListener('click', () => {
        const trackId = row.dataset.id;
        const tracks = getTracksForTab();
        const track = tracks.find(t => t.id === trackId) || SAMPLE_TRACKS[0];
        onSelectTrack(track);
      });
    });
  }
}

function renderLibraryTracks(tracks, tab) {
  if (tracks.length === 0) {
    return `
      <div style="text-align: center; color: var(--text-secondary); padding: 50px 20px;">
        ${tab === 'device' ? 'No device tracks imported yet.<br/><span style="font-size:12px;color:var(--text-muted);">Tap the download icon above to import MP3, FLAC, or WAV files.</span>' : 'No songs in this collection yet.'}
      </div>
    `;
  }

  return tracks.map(t => `
    <div class="track-row-item" data-id="${t.id}">
      <div class="track-row-left">
        <img class="track-row-thumb" src="${t.cover || DEFAULT_FALLBACK_COVER}" alt="${t.title}" loading="lazy" />
        <div class="track-row-info">
          <span class="track-row-title">${t.title}</span>
          <span class="track-row-artist">${t.artist}</span>
        </div>
      </div>

      <div class="track-row-right">
        <span class="track-duration-pill">${t.duration ? formatTime(t.duration) : '03:30'}</span>
        <button class="btn-circle-nav" style="width: 32px; height: 32px;">
          ${Icons.play(14)}
        </button>
      </div>
    </div>
  `).join('');
}

function formatTime(sec) {
  if (isNaN(sec) || sec < 0) return '03:30';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
