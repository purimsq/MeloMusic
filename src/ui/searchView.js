// View 5: Search Screen with instant covers & queue controls
import { Icons } from './icons.js';
import { SAMPLE_TRACKS, DEFAULT_FALLBACK_COVER } from '../data/samples.js';
import { ARTISTS } from '../data/artists.js';
import { Storage } from '../services/storage.js';

export function renderSearchView(container, { audioEngine, onSelectTrack }) {
  container.innerHTML = `
    <div class="view view-search" id="view-search">
      <div class="home-section-header" style="margin-bottom: 0;">
        <h2 class="section-title">Search</h2>
        <span style="font-size: 12px; color: var(--text-secondary); font-weight: 600;">Worldwide</span>
      </div>

      <!-- Search Input Wrap -->
      <div class="search-input-wrap">
        ${Icons.search(20)}
        <input type="text" id="global-search-input" placeholder="Songs, artists, or podcasts..." autofocus autocomplete="off" />
        <button id="btn-clear-search" style="background: none; border: none; cursor: pointer; color: var(--text-muted); display: none;">
          ${Icons.close(18)}
        </button>
      </div>

      <!-- Search Results Area -->
      <div class="vertical-track-list" id="search-results-list">
        ${renderSearchResults(SAMPLE_TRACKS, audioEngine)}
      </div>
    </div>
  `;

  const input = container.querySelector('#global-search-input');
  const clearBtn = container.querySelector('#btn-clear-search');
  const resultsContainer = container.querySelector('#search-results-list');

  input.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    clearBtn.style.display = q ? 'block' : 'none';

    if (!q) {
      resultsContainer.innerHTML = renderSearchResults(SAMPLE_TRACKS, audioEngine);
      attachTrackEvents();
      return;
    }

    const filtered = SAMPLE_TRACKS.filter(t => 
      t.title.toLowerCase().includes(q) || 
      t.artist.toLowerCase().includes(q) ||
      (t.album && t.album.toLowerCase().includes(q))
    );

    // Also search across artist catalog
    const matchedArtists = ARTISTS.filter(a => a.name.toLowerCase().includes(q));
    matchedArtists.forEach(artist => {
      artist.topSongs.forEach(songName => {
        if (!filtered.some(f => f.title.toLowerCase() === songName.toLowerCase())) {
          filtered.push({
            id: `artist-song-${artist.id}-${songName.replace(/\s+/g, '-').toLowerCase()}`,
            title: songName.toUpperCase(),
            artist: artist.name,
            duration: 210,
            cover: artist.photo,
            audioUrl: 'https://cdn.freesound.org/previews/558/558778_11861866-lq.mp3'
          });
        }
      });
    });

    resultsContainer.innerHTML = renderSearchResults(filtered, audioEngine);
    attachTrackEvents();
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.style.display = 'none';
    resultsContainer.innerHTML = renderSearchResults(SAMPLE_TRACKS, audioEngine);
    attachTrackEvents();
  });

  function attachTrackEvents() {
    resultsContainer.querySelectorAll('.track-row-item').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.btn-row-action')) return;
        const trackId = row.dataset.id;
        const track = SAMPLE_TRACKS.find(t => t.id === trackId) || {
          id: trackId,
          title: row.querySelector('.track-row-title').textContent,
          artist: row.querySelector('.track-row-artist').textContent,
          duration: 210,
          cover: row.querySelector('img').src,
          audioUrl: 'https://cdn.freesound.org/previews/558/558778_11861866-lq.mp3'
        };
        onSelectTrack(track);
      });
    });

    // Add to Queue button
    resultsContainer.querySelectorAll('.btn-add-queue').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const row = btn.closest('.track-row-item');
        const trackId = row.dataset.id;
        const track = SAMPLE_TRACKS.find(t => t.id === trackId);
        if (track) {
          audioEngine.addToQueue(track);
          btn.innerHTML = Icons.check(16);
          setTimeout(() => { btn.innerHTML = '+'; }, 1500);
        }
      });
    });
  }

  attachTrackEvents();
}

function renderSearchResults(tracks, audioEngine) {
  if (tracks.length === 0) {
    return `<div style="text-align: center; color: var(--text-secondary); padding: 50px 0;">No matching songs found.</div>`;
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
        <button class="btn-circle-nav btn-row-action btn-add-queue" title="Add to Queue" style="width: 32px; height: 32px; font-weight: 700; font-size: 16px;">
          +
        </button>
        <button class="btn-circle-nav btn-row-action" title="Play Now" style="width: 32px; height: 32px;">
          ${Icons.play(14)}
        </button>
      </div>
    </div>
  `).join('');
}
