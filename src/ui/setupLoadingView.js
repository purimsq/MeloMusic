// View: Setting Up Personalized Music Universe Loading Screen
import { ARTISTS } from '../data/artists.js';
import { Storage } from '../services/storage.js';
import { authService } from '../services/authService.js';

export function renderSetupLoadingView(container, { onComplete }) {
  const favoriteArtistIds = Storage.getFavoriteArtists();
  // Get top 6-7 selected artists (fallback to top world artists if none)
  let selectedArtists = ARTISTS.filter(a => favoriteArtistIds.includes(a.id));
  if (selectedArtists.length === 0) {
    selectedArtists = ARTISTS.slice(0, 7);
  } else if (selectedArtists.length < 6) {
    // Fill up to 6 with popular artists
    const remaining = ARTISTS.filter(a => !selectedArtists.some(s => s.id === a.id));
    selectedArtists = [...selectedArtists, ...remaining].slice(0, 7);
  } else {
    selectedArtists = selectedArtists.slice(0, 7);
  }

  container.innerHTML = `
    <div class="view view-setup-loading active" id="view-setup-loading">
      <!-- Visible Ambient Ceramic Clouds in Background -->
      <div class="ambient-clouds-layer">
        <div class="cloud-cluster setup-cloud-1">
          <div class="cloud-body"></div>
          <div class="cloud-puff puff-left"></div>
          <div class="cloud-puff puff-center"></div>
          <div class="cloud-puff puff-right"></div>
        </div>
        <div class="cloud-cluster setup-cloud-2">
          <div class="cloud-body"></div>
          <div class="cloud-puff puff-left"></div>
          <div class="cloud-puff puff-center"></div>
          <div class="cloud-puff puff-right"></div>
        </div>
        <div class="cloud-cluster setup-cloud-3">
          <div class="cloud-body"></div>
          <div class="cloud-puff puff-left"></div>
          <div class="cloud-puff puff-center"></div>
          <div class="cloud-puff puff-right"></div>
        </div>
        <div class="cloud-cluster setup-cloud-4">
          <div class="cloud-body"></div>
          <div class="cloud-puff puff-left"></div>
          <div class="cloud-puff puff-center"></div>
        </div>
      </div>

      <!-- Top Brand Status Bar -->
      <div class="setup-top-bar">
        <div class="setup-brand-pill" style="display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.05); padding: 6px 14px; border-radius: 20px;">
          <img src="/icons/logo-badge.png" alt="Melo" style="width: 18px; height: 18px; object-fit: contain;" />
          <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; color: var(--text-secondary);">Curator AI</span>
        </div>
        <div class="setup-live-pill" style="display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: #1E7227; background: rgba(30, 114, 39, 0.08); padding: 5px 12px; border-radius: 14px;">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: #1E7227; animation: pulseGlow 1.5s infinite;"></span>
          Curating
        </div>
      </div>

      <!-- Full-Screen Floating Universe Stage (Icons floating all across the screen) -->
      <div class="setup-universe-stage">
        <!-- Center Luxury Circular Pulse Loader -->
        <div class="setup-center-pulse">
          <svg class="setup-spinner-svg" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" class="spinner-bg-circle" />
            <circle cx="60" cy="60" r="50" class="spinner-accent-circle" id="setup-progress-circle" />
          </svg>
          <div class="setup-percent-number" id="setup-percent-display">0%</div>
        </div>

        <!-- 6 to 7 Artist Bubbles floating freely all across the screen around center -->
        ${selectedArtists.map((artist, i) => `
          <div class="setup-floating-artist setup-artist-pos-${i}" title="${artist.name}">
            <div class="setup-artist-float-inner">
              <div class="setup-artist-mask" style="clip-path: url(#flower-mask-artist);">
                <img src="${artist.photo}" alt="${artist.name}" />
              </div>
              <span class="setup-artist-chip">${artist.name}</span>
            </div>
          </div>
        `).join('')}

        <!-- Success Green Tick Badge (Matches user's outline clipart in dark green) -->
        <div class="setup-success-card" id="setup-success-card">
          <div class="setup-check-wrap">
            <svg class="setup-check-svg" viewBox="0 0 100 100" fill="none">
              <!-- Dark green outline circle (no fill) -->
              <circle cx="50" cy="50" r="38" stroke="#1E7227" stroke-width="8.5" class="setup-check-ring" />
              <!-- Dark green bold checkmark punching slightly through top-right rim -->
              <path d="M 33 53 L 47 67 L 81 25" stroke="#1E7227" stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round" class="setup-check-tick" />
            </svg>
          </div>
          <div class="setup-success-title">Profile all set up</div>
        </div>
      </div>

      <!-- Bottom Status Text & Animated Phrases -->
      <div class="setup-info-bottom">
        <h2 class="setup-headline" id="setup-status-title">Setting Up Your Vibe</h2>
        <p class="setup-substatus" id="setup-status-sub">
          Analyzing your music taste and preferred artists...
        </p>

        <!-- Aesthetic progress bar -->
        <div class="setup-bottom-progress-bar">
          <div class="setup-bottom-progress-fill" id="setup-linear-fill"></div>
        </div>
      </div>
    </div>
  `;

  const percentDisplay = container.querySelector('#setup-percent-display');
  const circleProgress = container.querySelector('#setup-progress-circle');
  const linearFill = container.querySelector('#setup-linear-fill');
  const titleDisplay = container.querySelector('#setup-status-title');
  const subDisplay = container.querySelector('#setup-status-sub');

  const circumference = 2 * Math.PI * 50; // ~314.16
  circleProgress.style.strokeDasharray = circumference;
  circleProgress.style.strokeDashoffset = circumference;

  const phrases = [
    { threshold: 0, title: 'Setting Up Your Vibe', sub: 'Analyzing your chosen artists & sound profiles...' },
    { threshold: 22, title: 'Curating Custom Mixes', sub: 'Gathering top tracks, acoustic versions & live gems...' },
    { threshold: 50, title: 'Connecting Streaming Engine', sub: 'Linking high-fidelity audio streams & synced lyrics...' },
    { threshold: 76, title: 'Building Your Library', sub: 'Preparing offline caching and personalized radio flow...' },
    { threshold: 92, title: 'Finalizing Master Tuner', sub: 'Your personal music sanctuary is ready!' }
  ];

  let currentPercent = 0;
  let isDone = false;

  const durationMs = 9000; // 9s refined setup experience
  const intervalMs = 100;
  const step = (100 / (durationMs / intervalMs));

  const timer = setInterval(() => {
    if (isDone) return;
    currentPercent = Math.min(100, currentPercent + step);

    // Update displays
    percentDisplay.textContent = `${Math.floor(currentPercent)}%`;
    const offset = circumference * (1 - currentPercent / 100);
    circleProgress.style.strokeDashoffset = offset;
    linearFill.style.width = `${currentPercent}%`;

    // Update phrases
    for (let i = phrases.length - 1; i >= 0; i--) {
      if (currentPercent >= phrases[i].threshold) {
        titleDisplay.textContent = phrases[i].title;
        subDisplay.textContent = phrases[i].sub;
        break;
      }
    }

    if (currentPercent >= 100) {
      clearInterval(timer);
      triggerSuccessSequence();
    }
  }, intervalMs);

  function triggerSuccessSequence() {
    if (isDone) return;
    isDone = true;
    clearInterval(timer);

    // Save one-time onboarding completion (Spotify-style)
    Storage.setCompletedOnboarding(true);

    // Send onboarding welcome email with Melo logo & curated artists
    const artistNames = selectedArtists.map(a => a.name);
    authService.sendWelcomeEmail(artistNames);

    // 1. Fade away all floating artist profiles with elegant staggered delay
    const artistEls = container.querySelectorAll('.setup-floating-artist');
    artistEls.forEach((el, idx) => {
      el.style.transitionDelay = `${idx * 45}ms`;
      el.classList.add('fade-away');
    });

    // 2. Fade out the circular percentage pulse loader
    const centerPulse = container.querySelector('.setup-center-pulse');
    if (centerPulse) {
      centerPulse.classList.add('fade-out');
    }

    // 3. Reveal green tick checkmark badge with "Profile all set up"
    const successCard = container.querySelector('#setup-success-card');
    if (successCard) {
      successCard.classList.add('show');
    }

    // 4. Update bottom status headline & fill progress bar with emerald green
    titleDisplay.textContent = 'Profile All Set Up';
    subDisplay.textContent = 'Welcome to Melo! Opening your music sanctuary...';
    linearFill.style.background = '#1E7227';
    linearFill.style.width = '100%';

    // 5. Smooth pause so user sees the checkmark, then open the dashboard!
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 1800);
  }
}
