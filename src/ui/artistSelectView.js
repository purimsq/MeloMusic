// View 2: Choose Your Favorite Artist (Smooth Transitions & Instant Search)
import { ARTISTS } from '../data/artists.js';
import { Icons } from './icons.js';
import { Storage } from '../services/storage.js';

export function renderArtistSelectView(container, { onBack, onComplete, onSkip }) {
  const savedFavorites = new Set(Storage.getFavoriteArtists());
  if (savedFavorites.size === 0) {
    savedFavorites.add('lana-del-rey');
  }

  container.innerHTML = `
    <div class="view view-artist-select" id="view-artist-select">
      <!-- Top Navigation Bar -->
      <div class="select-header">
        <button class="btn-circle-nav" id="btn-artist-back" title="Go back">
          ${Icons.chevronLeft(20)}
        </button>

        <div class="header-progress-wrap">
          <span class="header-subtitle">Your Taste</span>
          <div class="progress-track-bar">
            <div class="progress-track-fill"></div>
          </div>
        </div>

        <button class="btn-circle-nav" id="btn-artist-skip" title="Skip">
          ${Icons.close(18)}
        </button>
      </div>

      <!-- Main Title Section -->
      <div class="artist-title-section">
        <h2 class="artist-main-heading">
          Choose <span>Your Favorite<br />Artist</span>
        </h2>

        <!-- Search Bar -->
        <div class="artist-search-bar">
          ${Icons.search(18)}
          <input type="text" id="artist-search-input" placeholder="Search artists..." autocomplete="off" />
        </div>
      </div>

      <!-- Floating Artist Cloud Grid -->
      <div class="artist-cloud-container" id="artist-cloud-grid">
        ${renderAllArtistBubbles(ARTISTS, savedFavorites)}
      </div>

      <!-- Bottom Action Area -->
      <div class="artist-bottom-actions">
        <div class="selection-count-pill" id="selection-counter">
          ${savedFavorites.size} artist${savedFavorites.size === 1 ? '' : 's'} selected
        </div>
        <button class="btn-black-pill" id="btn-artist-continue">
          Continue
        </button>
      </div>
    </div>
  `;

  const grid = container.querySelector('#artist-cloud-grid');
  const searchInput = container.querySelector('#artist-search-input');
  const counter = container.querySelector('#selection-counter');

  function updateCounter() {
    counter.textContent = `${savedFavorites.size} artist${savedFavorites.size === 1 ? '' : 's'} selected`;
  }

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

  // Smooth debounced / animated search filter
  let debounceTimer = null;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const q = e.target.value.toLowerCase().trim();

    debounceTimer = setTimeout(() => {
      const allCards = grid.querySelectorAll('.artist-card-bubble');
      allCards.forEach(card => {
        const name = card.dataset.name.toLowerCase();
        const genre = card.dataset.genre.toLowerCase();
        const matches = !q || name.includes(q) || genre.includes(q);

        if (matches) {
          card.style.display = 'flex';
          requestAnimationFrame(() => {
            card.classList.remove('fade-out');
          });
        } else {
          card.classList.add('fade-out');
          setTimeout(() => {
            if (card.classList.contains('fade-out')) {
              card.style.display = 'none';
            }
          }, 300);
        }
      });
    }, 120);
  });

  // Navigation handlers
  container.querySelector('#btn-artist-back').addEventListener('click', onBack);
  container.querySelector('#btn-artist-skip').addEventListener('click', onSkip);
  container.querySelector('#btn-artist-continue').addEventListener('click', () => {
    Storage.setFavoriteArtists(Array.from(savedFavorites));
    onComplete(Array.from(savedFavorites));
  });
}

function renderAllArtistBubbles(artists, selectedSet) {
  return artists.map(artist => {
    const isSelected = selectedSet.has(artist.id);
    return `
      <div class="artist-card-bubble ${isSelected ? 'selected' : ''}" data-id="${artist.id}" data-name="${artist.name}" data-genre="${artist.genre}">
        <div class="artist-mask-wrap">
          <div style="width: 100%; height: 100%; clip-path: url(#flower-mask-artist); overflow: hidden;">
            <img class="artist-mask-img" src="${artist.photo}" alt="${artist.name}" loading="lazy" />
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
