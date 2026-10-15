// View 4: Comprehensive Deep Home Music Feed & Profile
import { Icons } from './icons.js';
import { Storage } from '../services/storage.js';
import { SAMPLE_TRACKS, DEFAULT_FALLBACK_COVER } from '../data/samples.js';
import { ARTISTS } from '../data/artists.js';
import { generateCuratedMixes } from '../data/mixGenerator.js';

export function renderHomeView(container, { audioEngine, onSelectTrack, onOpenPlaylist, onOpenEqualizer, onOpenPlayer }) {
  const userProfile = Storage.getUserProfile() || { name: 'Friend' };
  const favoriteArtistIds = Storage.getFavoriteArtists();
  const likedSongs = Storage.getLikedSongs();

  // Curate 5 rich mixes, each guaranteed to have 25-30 songs
  const curatedMixes = generateCuratedMixes(favoriteArtistIds);

  // Find user's selected artists (fallback to top 4)
  const userArtists = ARTISTS.filter(a => favoriteArtistIds.includes(a.id));
  const primaryArtist = userArtists.length > 0 ? userArtists[0] : ARTISTS[1]; // Billie or Drake
  
  let isOffline = !navigator.onLine;

  // Build extended tracks database from artists
  const extendedArtistTracks = [];
  userArtists.forEach(artist => {
    artist.topSongs.forEach((song, idx) => {
      extendedArtistTracks.push({
        id: `fav-track-${artist.id}-${idx}`,
        title: song.toUpperCase(),
        artist: artist.name,
        album: `${artist.name} Collection`,
        duration: 190 + (idx * 15),
        cover: artist.photo,
        audioUrl: SAMPLE_TRACKS[idx % SAMPLE_TRACKS.length].audioUrl
      });
    });
  });

  const fullTrackCatalog = [...SAMPLE_TRACKS, ...extendedArtistTracks];

  function buildHtml() {
    return `
      <div class="view view-home" id="view-home">
        <!-- Top Bar -->
        <div class="home-top-bar">
          <div class="home-user-pill">
            <div class="user-avatar-circle">
              ${(userProfile.name || 'M')[0].toUpperCase()}
            </div>
            <div>
              <span class="user-greeting">Welcome back,</span>
              <h3 class="user-name">${userProfile.name || 'Music Lover'}</h3>
            </div>
          </div>

          <div class="home-top-actions">
            <!-- Offline Simulation / Status Toggle -->
            <button class="btn-circle-nav" id="btn-toggle-network" title="Toggle Offline Simulation">
              ${isOffline ? Icons.wifiOff(18) : `<span style="width: 8px; height: 8px; border-radius: 50%; background: #4CAF50;"></span>`}
            </button>
            <!-- Equalizer & Sound Studio button -->
            <button class="btn-circle-nav" id="btn-home-equalizer" title="Equalizer & Sound Studio">
              ${Icons.sliders(18)}
            </button>
          </div>
        </div>

        <!-- Offline Banner (Shows only when offline) -->
        ${isOffline ? `
          <div class="offline-banner" id="offline-banner">
            <div>
              <span class="offline-pill-tag">OFFLINE MODE</span>
              <p style="margin-top: 4px; font-size: 13px;">Playing directly from your Local Vault</p>
            </div>
            ${Icons.wifiOff(20)}
          </div>
        ` : ''}

        <!-- 1. Quick Play Grid (Jump Back In - Top 6 Tiles) -->
        <div>
          <div class="quick-play-grid">
            ${renderQuickPlayTiles(fullTrackCatalog.slice(0, 6))}
          </div>
        </div>

        <!-- 2. Made For You (Artist Mixes Carousel) -->
        <div>
          <div class="home-section-header">
            <div>
              <h3 class="section-title">${isOffline ? 'Offline Essentials' : 'Made For You'}</h3>
              <p class="section-subtitle">Personalized mixes based on your taste</p>
            </div>
            <span class="section-badge">Daily Mix</span>
          </div>

          <div class="horizontal-scroll-row" id="home-curated-row">
            ${renderMixCards(curatedMixes)}
          </div>
        </div>

        <!-- 3. Heavy Rotation (Top Hits Right Now) -->
        <div>
          <div class="home-section-header">
            <div>
              <h3 class="section-title">${isOffline ? 'Available Offline' : 'Heavy Rotation'}</h3>
              <p class="section-subtitle">Tracks on repeat around the world</p>
            </div>
            <span class="section-badge">Popular</span>
          </div>

          <div class="vertical-track-list">
            ${renderTrackRows(fullTrackCatalog.slice(0, 5), audioEngine)}
          </div>
        </div>

        <!-- 4. Mood & Vibe Stations (Aesthetic Grid) -->
        <div>
          <div class="home-section-header">
            <div>
              <h3 class="section-title">Mood Stations</h3>
              <p class="section-subtitle">Curated soundscapes for any moment</p>
            </div>
          </div>

          <div class="mood-stations-grid">
            <div class="mood-card mood-chill" data-genre="Chill">
              <span class="mood-title">Late Night Drive</span>
              <span class="mood-sub">Synthwave • R&B</span>
            </div>
            <div class="mood-card mood-energy" data-genre="Energy">
              <span class="mood-title">Pure Energy</span>
              <span class="mood-sub">Hip-Hop • Trap</span>
            </div>
            <div class="mood-card mood-lofi" data-genre="Lofi">
              <span class="mood-title">Deep Focus</span>
              <span class="mood-sub">Lofi • Acoustic</span>
            </div>
            <div class="mood-card mood-dream" data-genre="Dream">
              <span class="mood-title">Vintage Dreams</span>
              <span class="mood-sub">Dream Pop • Indie</span>
            </div>
          </div>
        </div>

        <!-- 5. Spotlight: Because You Love [Primary Artist] -->
        <div>
          <div class="home-section-header">
            <div>
              <h3 class="section-title">Because You Love ${primaryArtist.name}</h3>
              <p class="section-subtitle">Deep cuts and similar sound profiles</p>
            </div>
          </div>

          <div class="horizontal-scroll-row">
            ${renderArtistSpotlightRow(primaryArtist)}
          </div>
        </div>

        <!-- 6. Global Top Countdown (Ranked 01 - 05) -->
        <div>
          <div class="home-section-header">
            <div>
              <h3 class="section-title">Global Top 5 Countdown</h3>
              <p class="section-subtitle">Most streamed tracks this week</p>
            </div>
            <span class="section-badge">Top Charts</span>
          </div>

          <div class="vertical-track-list">
            ${renderRankedTrackList(fullTrackCatalog.slice(0, 5), audioEngine)}
          </div>
        </div>

        <!-- 7. Sound Profile & Listening Universe (Full Stats Card) -->
        <div class="profile-stats-card">
          <div class="profile-card-header">
            <div>
              <span class="profile-badge">Melo Sound Signature</span>
              <h3 class="profile-stat-title">Your Audio Universe</h3>
            </div>
            <div class="profile-avatar-chip">
              ${(userProfile.name || 'M')[0].toUpperCase()}
            </div>
          </div>

          <div class="profile-metrics-row">
            <div class="metric-item">
              <span class="metric-value">${userArtists.length || 7}</span>
              <span class="metric-label">Key Artists</span>
            </div>
            <div class="metric-item">
              <span class="metric-value">320k</span>
              <span class="metric-label">Lossless Hi-Fi</span>
            </div>
            <div class="metric-item">
              <span class="metric-value">100%</span>
              <span class="metric-label">Ad-Free Stream</span>
            </div>
          </div>

          <p class="profile-taste-summary">
            Your taste blends <strong>${primaryArtist.name}</strong>, <strong>${primaryArtist.genre}</strong>, and nocturnal atmospheric beats.
          </p>
        </div>
      </div>
    `;
  }

  container.innerHTML = buildHtml();
  attachEvents();

  function attachEvents() {
    // Network toggle simulation
    const netToggle = container.querySelector('#btn-toggle-network');
    if (netToggle) {
      netToggle.addEventListener('click', () => {
        isOffline = !isOffline;
        container.innerHTML = buildHtml();
        attachEvents();
      });
    }

    // Equalizer trigger
    const eqBtn = container.querySelector('#btn-home-equalizer');
    if (eqBtn) {
      eqBtn.addEventListener('click', onOpenEqualizer);
    }

    // Quick Play tile clicks
    container.querySelectorAll('.quick-play-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const trackId = tile.dataset.id;
        const track = fullTrackCatalog.find(t => t.id === trackId);
        if (track) onSelectTrack(track);
      });
    });

    // 1. Curated Mix Card clicks -> Open Playlist View (25-30 songs)
    container.querySelectorAll('.mix-card-item').forEach(card => {
      card.addEventListener('click', (e) => {
        const mixId = card.dataset.mixId;
        const mix = curatedMixes.find(m => m.id === mixId);
        if (!mix) return;

        // If specifically clicked play overlay button, play immediately
        if (e.target.closest('.card-play-overlay-btn')) {
          e.stopPropagation();
          audioEngine.isShuffle = false;
          audioEngine.setQueue(mix.tracks, 0, true);
          if (onOpenPlayer) onOpenPlayer();
          return;
        }

        // Open dedicated playlist page with all 25-30 songs
        if (onOpenPlaylist) {
          onOpenPlaylist(mix);
        }
      });
    });

    // 2. Individual Scalloped track cards (Spotlight etc.)
    container.querySelectorAll('.music-card-scalloped:not(.mix-card-item)').forEach(card => {
      card.addEventListener('click', () => {
        const trackId = card.dataset.id;
        const track = fullTrackCatalog.find(t => t.id === trackId);
        if (track) onSelectTrack(track);
      });
    });

    // 3. Track row clicks
    container.querySelectorAll('.track-row-item').forEach(row => {
      row.addEventListener('click', () => {
        const trackId = row.dataset.id;
        const track = fullTrackCatalog.find(t => t.id === trackId);
        if (track) onSelectTrack(track);
      });
    });

    // 4. Mood card clicks -> Open matching curated 25-30 track mix!
    container.querySelectorAll('.mood-card').forEach(mood => {
      mood.addEventListener('click', () => {
        const genre = mood.dataset.genre;
        let targetMix = curatedMixes[0];
        if (genre === 'Chill') targetMix = curatedMixes.find(m => m.id === 'mix-nocturnal') || curatedMixes[1];
        else if (genre === 'Energy') targetMix = curatedMixes.find(m => m.id === 'mix-energy') || curatedMixes[2];
        else if (genre === 'Dream' || genre === 'Lofi') targetMix = curatedMixes.find(m => m.id === 'mix-pop') || curatedMixes[3];
        
        if (onOpenPlaylist) {
          onOpenPlaylist(targetMix);
        } else {
          audioEngine.setQueue(targetMix.tracks, 0, true);
          if (onOpenPlayer) onOpenPlayer();
        }
      });
    });
  }

  window.addEventListener('online', () => {
    isOffline = false;
    container.innerHTML = buildHtml();
    attachEvents();
  });
  window.addEventListener('offline', () => {
    isOffline = true;
    container.innerHTML = buildHtml();
    attachEvents();
  });
}

function renderQuickPlayTiles(tracks) {
  return tracks.map(t => `
    <div class="quick-play-tile" data-id="${t.id}">
      <img src="${t.cover || DEFAULT_FALLBACK_COVER}" alt="${t.title}" loading="lazy" />
      <span class="quick-play-title">${t.title}</span>
      <button class="quick-play-action-btn" title="Play">
        ${Icons.play(14)}
      </button>
    </div>
  `).join('');
}

function renderMixCards(mixes) {
  return mixes.map(mix => `
    <div class="music-card-scalloped mix-card-item" data-mix-id="${mix.id}">
      <div class="card-scallop-thumb">
        <img src="${mix.cover || DEFAULT_FALLBACK_COVER}" alt="${mix.title}" loading="lazy" />
        <span class="mix-card-count-badge">${mix.tracks.length} tracks</span>
        <button class="card-play-overlay-btn" title="Play ${mix.title}">
          ${Icons.play(18)}
        </button>
      </div>
      <span class="card-title">${mix.title}</span>
      <span class="card-subtitle">${mix.subtitle}</span>
    </div>
  `).join('');
}

function renderScallopedCards(tracks) {
  return tracks.map(t => `
    <div class="music-card-scalloped" data-id="${t.id}">
      <div class="card-scallop-thumb">
        <img src="${t.cover || DEFAULT_FALLBACK_COVER}" alt="${t.title}" loading="lazy" />
        <button class="card-play-overlay-btn">
          ${Icons.play(18)}
        </button>
      </div>
      <span class="card-title">${t.title}</span>
      <span class="card-subtitle">${t.artist}</span>
    </div>
  `).join('');
}

function renderTrackRows(tracks, audioEngine) {
  const currentId = audioEngine.currentTrack?.id;
  return tracks.map(t => {
    const isPlayingThis = currentId === t.id && audioEngine.isPlaying;
    return `
      <div class="track-row-item ${currentId === t.id ? 'playing' : ''}" data-id="${t.id}">
        <div class="track-row-left">
          <img class="track-row-thumb" src="${t.cover || DEFAULT_FALLBACK_COVER}" alt="${t.title}" loading="lazy" />
          <div class="track-row-info">
            <span class="track-row-title">${t.title}</span>
            <span class="track-row-artist">${t.artist}</span>
          </div>
        </div>

        <div class="track-row-right">
          <span class="track-duration-pill">${formatTime(t.duration)}</span>
          <div style="color: var(--accent-black);">
            ${isPlayingThis ? Icons.pause(18) : Icons.play(18)}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderRankedTrackList(tracks, audioEngine) {
  const currentId = audioEngine.currentTrack?.id;
  return tracks.map((t, idx) => {
    const isPlayingThis = currentId === t.id && audioEngine.isPlaying;
    return `
      <div class="track-row-item ranked-row ${currentId === t.id ? 'playing' : ''}" data-id="${t.id}">
        <div class="track-row-left">
          <span class="rank-number-label">${(idx + 1).toString().padStart(2, '0')}</span>
          <img class="track-row-thumb" src="${t.cover || DEFAULT_FALLBACK_COVER}" alt="${t.title}" loading="lazy" />
          <div class="track-row-info">
            <span class="track-row-title">${t.title}</span>
            <span class="track-row-artist">${t.artist}</span>
          </div>
        </div>

        <div class="track-row-right">
          <span class="track-duration-pill">${formatTime(t.duration)}</span>
          <div style="color: var(--accent-black);">
            ${isPlayingThis ? Icons.pause(18) : Icons.play(18)}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderArtistSpotlightRow(artist) {
  return artist.topSongs.map((song, i) => `
    <div class="music-card-scalloped" data-id="spotlight-${artist.id}-${i}">
      <div class="card-scallop-thumb">
        <img src="${artist.photo}" alt="${song}" loading="lazy" />
        <button class="card-play-overlay-btn">
          ${Icons.play(18)}
        </button>
      </div>
      <span class="card-title">${song.toUpperCase()}</span>
      <span class="card-subtitle">${artist.name}</span>
    </div>
  `).join('');
}

function formatTime(sec) {
  if (isNaN(sec) || sec < 0) return '03:30';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
