// View 4: Comprehensive Deep Home Music Feed & Dynamic Profile
import { Icons } from './icons.js';
import { Storage } from '../services/storage.js';
import { SAMPLE_TRACKS, DEFAULT_FALLBACK_COVER } from '../data/samples.js';
import { ARTISTS } from '../data/artists.js';
import { generateCuratedMixes } from '../data/mixGenerator.js';
import { networkService } from '../services/networkService.js';
import { authService } from '../services/authService.js';

export function renderHomeView(container, { audioEngine, onSelectTrack, onOpenPlaylist, onOpenEqualizer, onOpenPlayer, onOpenAuth, onLogout }) {
  let userProfile = Storage.getUserProfile() || { name: 'Music Lover', email: 'guest@melomusic.app' };
  let favoriteArtistIds = Storage.getFavoriteArtists();
  let likedSongs = Storage.getLikedSongs();
  let isOnline = networkService.isOnline;
  let isCheckingNetwork = false;
  let toastTimeout = null;

  // Curate 5 rich mixes, each guaranteed to have 25-30 songs based on user preferences
  let curatedMixes = generateCuratedMixes(favoriteArtistIds);

  // Find user's selected artists (fallback to top 4)
  let userArtists = ARTISTS.filter(a => favoriteArtistIds.includes(a.id));
  let primaryArtist = userArtists.length > 0 ? userArtists[0] : ARTISTS[1];

  // Extended track catalog
  function buildCatalog() {
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
          needsResolution: true
        });
      });
    });
    return [...SAMPLE_TRACKS, ...extendedArtistTracks];
  }

  let fullTrackCatalog = buildCatalog();

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning,';
    if (hour < 18) return 'Good afternoon,';
    return 'Good evening,';
  }

  function buildHtml() {
    const greeting = getGreeting();
    const initials = (userProfile.name || 'M')[0].toUpperCase();
    const isLoggedIn = !!(userProfile.isLoggedIn || authService.currentUser);
    const isCurrentlyActive = container.querySelector('.view')?.classList.contains('active') ?? true;

    return `
      <div class="view view-home ${isCurrentlyActive ? 'active' : ''}" id="view-home">

        <!-- Top Bar with Dynamic User Profile & Live Internet Status -->
        <div class="home-top-bar">
          <div class="home-user-pill" id="btn-open-user-profile" title="Open Your Profile & Audio Universe" style="cursor: pointer;">
            <div class="user-avatar-circle">
              ${userProfile.photoURL ? `<img src="${userProfile.photoURL}" alt="${userProfile.name}" class="user-avatar-img" />` : initials}
            </div>
            <div>
              <span class="user-greeting">${greeting}</span>
              <h3 class="user-name">${userProfile.name || 'Music Lover'}</h3>
            </div>
          </div>

          <div class="home-top-actions">
            <!-- Active Internet Connectivity Indicator -->
            <button class="btn-circle-nav ${isOnline ? 'online-wifi' : 'offline-wifi'}" id="btn-toggle-network" 
                    title="${isOnline ? 'Internet Connected (Wi-Fi Online)' : 'Offline (No Internet Connection)'}">
              ${isOnline ? Icons.wifi(18) : Icons.wifiOff(18)}
            </button>

            <!-- 5-Band Equalizer & Sound Studio button -->
            <button class="btn-circle-nav" id="btn-home-equalizer" title="Equalizer & Sound Studio">
              ${Icons.sliders(18)}
            </button>
          </div>
        </div>

        <!-- Offline Banner (Shows only when real ping fails) -->
        ${!isOnline ? `
          <div class="offline-banner" id="offline-banner">
            <div>
              <span class="offline-pill-tag">OFFLINE MODE</span>
              <p style="margin-top: 4px; font-size: 13px;">Playing directly from your Offline Local Vault</p>
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

        <!-- 2. Made For You (Artist Mixes Carousel - 25 to 30 songs each) -->
        <div>
          <div class="home-section-header">
            <div>
              <h3 class="section-title">${!isOnline ? 'Offline Essentials' : 'Made For You'}</h3>
              <p class="section-subtitle">25-30 tracks tuned to your selected artists</p>
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
              <h3 class="section-title">${!isOnline ? 'Available Offline' : 'Heavy Rotation'}</h3>
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
              ${initials}
            </div>
          </div>

          <div class="profile-metrics-row">
            <div class="metric-item">
              <span class="metric-value">${userArtists.length || 6}</span>
              <span class="metric-label">Key Artists</span>
            </div>
            <div class="metric-item" id="btn-metric-liked-songs" style="cursor: pointer;" title="Open Liked Songs">
              <span class="metric-value">${Storage.getLikedSongs().length}</span>
              <span class="metric-label">Liked Songs</span>
            </div>
            <div class="metric-item">
              <span class="metric-value">${Storage.getPlaylists().length}</span>
              <span class="metric-label">Playlists</span>
            </div>
          </div>

          <p class="profile-taste-summary">
            Your taste blends <strong>${primaryArtist.name}</strong>, <strong>${primaryArtist.genre}</strong>, and nocturnal atmospheric beats.
          </p>
        </div>

        <!-- Interactive User Profile Modal Sheet -->
        <div class="profile-modal-sheet" id="home-profile-sheet">
          <div class="profile-modal-card">
            <div class="auth-modal-header">
              <div>
                <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-secondary); font-weight: 700;">Account & Sound Profile</span>
                <h3 class="auth-modal-title">User Profile</h3>
              </div>
              <button class="btn-circle-nav" id="btn-close-profile-modal" title="Close">
                ${Icons.close(18)}
              </button>
            </div>

            <!-- Profile Hero Details -->
            <div style="display: flex; align-items: center; gap: 16px; background: var(--bg-surface); padding: 16px; border-radius: 20px; border: 1px solid var(--border-subtle);">
              <div class="user-avatar-circle" style="width: 56px; height: 56px; font-size: 20px; flex-shrink: 0;">
                ${userProfile.photoURL ? `<img src="${userProfile.photoURL}" alt="${userProfile.name}" class="user-avatar-img" />` : initials}
              </div>
              <div style="display: flex; flex-direction: column; overflow: hidden;">
                <h4 style="font-size: 17px; font-weight: 800; color: var(--text-primary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${userProfile.name || 'Melo Listener'}</h4>
                <span style="font-size: 12.5px; color: var(--text-secondary); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${userProfile.email || 'Melo Account'}</span>
                <div style="display: flex; align-items: center; gap: 6px; margin-top: 6px;">
                  <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: #2E7D32; background: rgba(46, 125, 50, 0.1); padding: 2px 8px; border-radius: 8px;">
                    ${Icons.check(12)} Authenticated Account
                  </span>
                </div>
              </div>
            </div>

            <!-- Profile Stats Grid -->
            <div class="profile-metrics-row" style="background: var(--bg-surface); border-radius: 18px; padding: 12px; margin: 0; border: 1px solid var(--border-subtle);">
              <div class="metric-item">
                <span class="metric-value">${userArtists.length || 6}</span>
                <span class="metric-label">Artists</span>
              </div>
              <div class="metric-item" id="btn-profile-metric-liked" style="cursor: pointer;" title="Open Liked Songs">
                <span class="metric-value">${Storage.getLikedSongs().length}</span>
                <span class="metric-label">Liked & Saved</span>
              </div>
              <div class="metric-item">
                <span class="metric-value">${Storage.getPlaylists().length}</span>
                <span class="metric-label">Playlists</span>
              </div>
            </div>

            <!-- Profile Actions -->
            <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 4px;">
              ${isLoggedIn ? `
                <button class="btn-black-pill" id="btn-profile-logout" style="background: #E53935; color: #FFF;">
                  Log Out from Melo
                </button>
              ` : `
                <button class="btn-black-pill" id="btn-profile-signin">
                  Sign In or Create Account
                </button>
              `}
              <button class="login-text-link" id="btn-profile-manage-eq" style="align-self: center; margin-top: 4px;">
                Open Equalizer Studio
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function showToast(message, isSuccess = true) {
    const toast = container.querySelector('#home-toast-banner');
    if (!toast) return;
    if (toastTimeout) clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.style.display = 'block';
    toast.style.background = isSuccess ? '#2E7D32' : '#D32F2F';
    toastTimeout = setTimeout(() => {
      toast.style.display = 'none';
    }, 3200);
  }

  container.innerHTML = buildHtml();
  attachEvents();

  // Subscribe to real network status changes
  const unsubscribeNetwork = networkService.subscribe(({ isOnline: netOnline }) => {
    if (isOnline !== netOnline) {
      isOnline = netOnline;
      const netBtn = container.querySelector('#btn-toggle-network');
      if (netBtn) {
        netBtn.className = `btn-circle-nav ${isOnline ? 'online-wifi' : 'offline-wifi'}`;
        netBtn.innerHTML = isOnline ? Icons.wifi(18) : Icons.wifiOff(18);
        netBtn.title = isOnline ? 'Internet Connected (Wi-Fi Online)' : 'Offline (No Internet Connection)';
      }
      const banner = container.querySelector('#offline-banner');
      if (banner) {
        banner.style.display = isOnline ? 'none' : 'flex';
      }
    }
  });

  // Subscribe to Firebase Auth / Profile updates
  const unsubscribeAuth = authService.subscribe((user, profile) => {
    if (profile) {
      userProfile = profile;
      const nameEl = container.querySelector('.user-name');
      if (nameEl) nameEl.textContent = profile.name || 'Music Lover';
      const avatarCircle = container.querySelector('.user-avatar-circle');
      if (avatarCircle) {
        avatarCircle.innerHTML = profile.photoURL
          ? `<img src="${profile.photoURL}" alt="${profile.name}" class="user-avatar-img" />`
          : (profile.name || 'M')[0].toUpperCase();
      }
    }
  });

  function attachEvents() {
    // 1. Profile Pill Click -> Open Profile Sheet
    const userPill = container.querySelector('#btn-open-user-profile');
    const profileSheet = container.querySelector('#home-profile-sheet');
    const closeProfileBtn = container.querySelector('#btn-close-profile-modal');

    userPill?.addEventListener('click', () => {
      profileSheet?.classList.add('open');
    });

    closeProfileBtn?.addEventListener('click', () => {
      profileSheet?.classList.remove('open');
    });

    profileSheet?.addEventListener('click', (e) => {
      if (e.target === profileSheet) {
        profileSheet.classList.remove('open');
      }
    });

    // Logout
    container.querySelector('#btn-profile-logout')?.addEventListener('click', async () => {
      profileSheet?.classList.remove('open');
      if (onLogout) {
        await onLogout();
      } else {
        await authService.logOut();
        if (onOpenAuth) onOpenAuth();
      }
    });

    // Sign in trigger
    container.querySelector('#btn-profile-signin')?.addEventListener('click', () => {
      profileSheet?.classList.remove('open');
      if (onOpenAuth) onOpenAuth();
    });

    // Open Liked Songs from metrics
    const openLikedSongsPage = () => {
      const likedTracks = Storage.getLikedSongs();
      if (onOpenPlaylist) {
        onOpenPlaylist({
          id: 'playlist-liked-songs',
          title: 'Liked Songs',
          description: `${likedTracks.length} tracks downloaded & available for offline listening`,
          cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80',
          tracks: likedTracks
        });
      }
    };

    container.querySelector('#btn-metric-liked-songs')?.addEventListener('click', openLikedSongsPage);
    container.querySelector('#btn-profile-metric-liked')?.addEventListener('click', () => {
      profileSheet?.classList.remove('open');
      openLikedSongsPage();
    });

    // Equalizer from profile
    container.querySelector('#btn-profile-manage-eq')?.addEventListener('click', () => {
      profileSheet?.classList.remove('open');
      if (onOpenEqualizer) onOpenEqualizer();
    });

    // 2. Network Button Click -> Safe Non-Destructive Status Feedback
    const netToggle = container.querySelector('#btn-toggle-network');
    if (netToggle) {
      netToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const online = networkService.isOnline;
        window.dispatchEvent(new CustomEvent('melo-toast', {
          detail: { message: online ? 'Online' : 'Offline' }
        }));
      });
    }

    // 3. Equalizer trigger
    const eqBtn = container.querySelector('#btn-home-equalizer');
    if (eqBtn) {
      eqBtn.addEventListener('click', onOpenEqualizer);
    }

    // 4. Quick Play tile clicks
    container.querySelectorAll('.quick-play-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const trackId = tile.dataset.id;
        const track = fullTrackCatalog.find(t => t.id === trackId);
        if (track) onSelectTrack(track);
      });
    });

    // 5. Curated Mix Card clicks -> Open Playlist View (25-30 songs)
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

    // 6. Individual Scalloped track cards
    container.querySelectorAll('.music-card-scalloped:not(.mix-card-item)').forEach(card => {
      card.addEventListener('click', () => {
        const trackId = card.dataset.id;
        const track = fullTrackCatalog.find(t => t.id === trackId);
        if (track) onSelectTrack(track);
      });
    });

    // 7. Track row clicks
    container.querySelectorAll('.track-row-item').forEach(row => {
      row.addEventListener('click', () => {
        const trackId = row.dataset.id;
        const track = fullTrackCatalog.find(t => t.id === trackId);
        if (track) onSelectTrack(track);
      });
    });

    // 8. Mood card clicks -> Open matching curated 25-30 track mix!
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

function renderArtistSpotlightRow(artist) {
  return artist.topSongs.map((songTitle, idx) => `
    <div class="music-card-scalloped" data-id="fav-track-${artist.id}-${idx}">
      <div class="card-scallop-thumb">
        <img src="${artist.photo || DEFAULT_FALLBACK_COVER}" alt="${songTitle}" loading="lazy" />
        <button class="card-play-overlay-btn">
          ${Icons.play(18)}
        </button>
      </div>
      <span class="card-title">${songTitle}</span>
      <span class="card-subtitle">${artist.name}</span>
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
    const rank = (idx + 1).toString().padStart(2, '0');
    const isPlayingThis = currentId === t.id && audioEngine.isPlaying;
    return `
      <div class="track-row-item ${currentId === t.id ? 'playing' : ''}" data-id="${t.id}">
        <div class="track-row-left">
          <span class="ranked-index">${rank}</span>
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

function formatTime(sec) {
  if (isNaN(sec) || sec <= 0) return '03:20';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
