// View 2: Choose Your Favorite Artist (Real Worldwide Artists & Live Search)
import { ARTISTS } from '../data/artists.js';
import { Icons } from './icons.js';
import { Storage } from '../services/storage.js';
import { musicSearchService } from '../services/musicSearchService.js';

export function renderArtistSelectView(container, { onBack, onComplete }) {
  const MIN_ARTISTS = 3;
  // Always start empty so the app never auto-selects artists for the user!
  const savedFavorites = new Set();

  // Combined artist catalog (starts with 24 real curated artists, dynamically appends searched artists)
  let allArtists = [...ARTISTS];
  let isSearchingWorldwide = false;
  let debounceTimer = null;

  function buildHtml() {
    const isReady = savedFavorites.size >= MIN_ARTISTS;
    const remaining = Math.max(0, MIN_ARTISTS - savedFavorites.size);

    return `
      <div class="view view-artist-select active" id="view-artist-select">
        <!-- Top Navigation Bar (Skip removed) -->
        <div class="select-header">
          <button class="btn-circle-nav" id="btn-artist-back" title="Go back">
            ${Icons.chevronLeft(20)}
          </button>

          <div class="header-progress-wrap">
            <span class="header-subtitle">Your Taste</span>
            <div class="progress-track-bar">
              <div class="progress-track-fill" id="artist-progress-fill" style="width: ${Math.min(100, (savedFavorites.size / MIN_ARTISTS) * 100)}%;"></div>
            </div>
          </div>

          <!-- Balanced spacing spacer (no skip button) -->
          <div style="width: 38px;"></div>
        </div>

        <!-- Main Title Section -->
        <div class="artist-title-section">
          <h2 class="artist-main-heading">
            Choose <span>Your Favorite<br />Artists</span>
          </h2>
          <p style="font-size: 12.5px; color: var(--text-secondary); margin-top: 4px;">Select at least 3 artists to craft your personalized daily mixes</p>

          <!-- Search Bar for Any Artist on YouTube or Spotify -->
          <div class="artist-search-bar" style="margin-top: 10px;">
            ${Icons.search(18)}
            <input type="text" id="artist-search-input" placeholder="Search any artist on Spotify / YouTube..." autocomplete="off" />
            <div id="artist-search-spinner" style="display: none; width: 16px; height: 16px; border: 2px solid var(--text-muted); border-top-color: var(--accent-black); border-radius: 50%; animation: spin 0.7s linear infinite;"></div>
          </div>
        </div>

        <!-- Floating Artist Cloud Grid -->
        <div class="artist-cloud-container" id="artist-cloud-grid">
          ${renderAllArtistBubbles(allArtists, savedFavorites)}
        </div>

        <!-- Bottom Action Area (Enforces minimum 3 artists) -->
        <div class="artist-bottom-actions">
          <div id="artist-select-alert" style="display: none; width: 100%; background: rgba(229, 57, 53, 0.08); border: 1px solid rgba(229, 57, 53, 0.25); border-radius: 14px; padding: 8px 14px; font-size: 12px; color: #D32F2F; text-align: center; margin-bottom: 6px;">
            Please select at least 3 artists to continue
          </div>

          <div class="selection-count-pill" id="selection-counter" style="${isReady ? 'color: #1E7227;' : ''}">
            ${isReady
              ? `${savedFavorites.size} artists selected ✓`
              : savedFavorites.size === 0
              ? 'Select at least 3 artists (0/3)'
              : `Select ${remaining} more artist${remaining === 1 ? '' : 's'} (${savedFavorites.size}/3)`}
          </div>
          <button class="btn-black-pill" id="btn-artist-continue" ${isReady ? '' : 'disabled'} style="${isReady ? 'opacity: 1; cursor: pointer;' : 'opacity: 0.45; cursor: not-allowed;'}">
            ${isReady ? 'Continue & Set Up Vault' : `Select ${remaining} More`}
          </button>
        </div>
      </div>
    `;
  }

  container.innerHTML = buildHtml();
  attachEvents();

  function updateCounter() {
    const counter = container.querySelector('#selection-counter');
    const btnContinue = container.querySelector('#btn-artist-continue');
    const progressFill = container.querySelector('#artist-progress-fill');
    const isReady = savedFavorites.size >= MIN_ARTISTS;
    const remaining = Math.max(0, MIN_ARTISTS - savedFavorites.size);

    if (counter) {
      if (isReady) {
        counter.textContent = `${savedFavorites.size} artists selected ✓`;
        counter.style.background = 'transparent';
        counter.style.color = '#1E7227';
      } else if (savedFavorites.size === 0) {
        counter.textContent = 'Select at least 3 artists (0/3)';
        counter.style.background = '';
        counter.style.color = '';
      } else {
        counter.textContent = `Select ${remaining} more artist${remaining === 1 ? '' : 's'} (${savedFavorites.size}/3)`;
        counter.style.background = '';
        counter.style.color = '';
      }
    }

    if (btnContinue) {
      btnContinue.disabled = !isReady;
      btnContinue.style.opacity = isReady ? '1' : '0.45';
      btnContinue.style.cursor = isReady ? 'pointer' : 'not-allowed';
      btnContinue.textContent = isReady ? 'Continue & Set Up Vault' : `Select ${remaining} More`;
    }

    if (progressFill) {
      progressFill.style.width = `${Math.min(100, (savedFavorites.size / MIN_ARTISTS) * 100)}%`;
    }
  }

  function attachEvents() {
    const grid = container.querySelector('#artist-cloud-grid');
    const searchInput = container.querySelector('#artist-search-input');
    const spinner = container.querySelector('#artist-search-spinner');

    // Handle artist selection toggle
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.artist-card-bubble');
      if (!card) return;

      const artistId = card.dataset.id;
      if (savedFavorites.has(artistId)) {
        savedFavorites.delete(artistId);
        card.classList.remove('selected');
      } else {
        savedFavorites.add(artistId);
        card.classList.add('selected');
      }
      updateCounter();
    });

    // Live search (filters local + searches worldwide artist catalog)
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      const q = e.target.value.trim();

      debounceTimer = setTimeout(async () => {
        // 1. Filter currently rendered cards
        const allCards = grid.querySelectorAll('.artist-card-bubble');
        allCards.forEach(card => {
          const name = card.dataset.name.toLowerCase();
          const genre = card.dataset.genre.toLowerCase();
          const matches = !q || name.includes(q.toLowerCase()) || genre.includes(q.toLowerCase());
          card.style.display = matches ? 'flex' : 'none';
        });

        // 2. If user types 2+ characters, also search real worldwide artists from Spotify/Apple catalog
        if (q.length >= 2) {
          if (spinner) spinner.style.display = 'block';
          const worldwideArtists = await musicSearchService.searchArtistsWorldwide(q);
          if (spinner) spinner.style.display = 'none';

          if (worldwideArtists && worldwideArtists.length > 0) {
            let hasNew = false;
            worldwideArtists.forEach(wa => {
              if (!allArtists.some(a => a.name.toLowerCase() === wa.name.toLowerCase())) {
                allArtists.push(wa);
                hasNew = true;
              }
            });

            if (hasNew) {
              grid.innerHTML = renderAllArtistBubbles(allArtists, savedFavorites);
              // Re-filter with current query
              grid.querySelectorAll('.artist-card-bubble').forEach(card => {
                const name = card.dataset.name.toLowerCase();
                const matches = name.includes(q.toLowerCase());
                card.style.display = matches ? 'flex' : 'none';
              });
            }
          }
        }
      }, 250);
    });

    // Navigation handlers
    container.querySelector('#btn-artist-back')?.addEventListener('click', onBack);
    container.querySelector('#btn-artist-continue')?.addEventListener('click', () => {
      if (savedFavorites.size < MIN_ARTISTS) {
        const alertEl = container.querySelector('#artist-select-alert');
        if (alertEl) {
          alertEl.style.display = 'block';
          setTimeout(() => { alertEl.style.display = 'none'; }, 3000);
        }
        return;
      }
      Storage.setFavoriteArtists(Array.from(savedFavorites));
      onComplete(Array.from(savedFavorites));
    });
  }
}

function renderAllArtistBubbles(artists, selectedSet) {
  return artists.map(artist => {
    const isSelected = selectedSet.has(artist.id);
    return `
      <div class="artist-card-bubble ${isSelected ? 'selected' : ''}" data-id="${artist.id}" data-name="${artist.name}" data-genre="${artist.genre || 'Popular'}">
        <div class="artist-mask-wrap">
          <div style="width: 100%; height: 100%; clip-path: url(#flower-mask-artist); overflow: hidden; background: #222;">
            <img class="artist-mask-img" src="${artist.photo}" alt="${artist.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80'" />
          </div>
          <!-- Animated Checkmark Badge -->
          <div class="artist-check-badge">
            ${Icons.check(16)}
          </div>
        </div>
        <span class="artist-name-label">${artist.name}</span>
      </div>
    `;
  }).join('');
}
