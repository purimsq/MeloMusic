// Melo Master Application Controller
import './style.css';
import { Icons } from './ui/icons.js';
import { audioEngine } from './services/audioEngine.js';
import { SAMPLE_TRACKS, DEFAULT_FALLBACK_COVER } from './data/samples.js';

// Views
import { renderOnboardingView } from './ui/onboardingView.js';
import { renderArtistSelectView } from './ui/artistSelectView.js';
import { renderSetupLoadingView } from './ui/setupLoadingView.js';
import { renderHomeView } from './ui/homeView.js';
import { renderSearchView } from './ui/searchView.js';
import { renderLibraryView } from './ui/libraryView.js';
import { renderPlayerView } from './ui/playerView.js';
import { renderPlaylistView } from './ui/playlistView.js';

// Modals & Sheets
import { renderLyricsModal } from './ui/lyricsModal.js';
import { renderAuthModal } from './ui/authModal.js';
import { renderEqualizerModal } from './ui/equalizerModal.js';
import { renderQueueModal } from './ui/queueModal.js';
import { authService } from './services/authService.js';
import { Storage } from './services/storage.js';
import { networkService } from './services/networkService.js';

class App {
  constructor() {
    this.root = document.querySelector('#app');
    this.currentView = 'onboarding';
    this.currentMainTab = 'home';
    this.isPlayerOpen = false;
    this.isPlaylistViewOpen = false;

    // Load initial sample track into audio engine queue
    audioEngine.loadTrack(SAMPLE_TRACKS[0], false);

    this.initLayout();
    this.initComponents();
    this.initGlobalEvents();
    this.initHistory();
  }

  initLayout() {
    this.root.innerHTML = `
      <div class="device-frame">
        <!-- Viewport for full views -->
        <div class="views-viewport" id="views-viewport">
          <div id="onboarding-container"></div>
          <div id="artist-select-container"></div>
          <div id="setup-loading-container"></div>
          <div id="home-container"></div>
          <div id="search-container"></div>
          <div id="library-container"></div>
          <div id="playlist-container" style="display: none;"></div>
          <div id="player-container"></div>
        </div>

        <!-- Global Toast Notification Banner -->
        <div id="global-toast-banner" class="global-toast-banner" style="display: none;"></div>

        <!-- Mini-Player Bar (docked above navigation) -->
        <div class="mini-player-bar hidden" id="mini-player-bar">
          <div class="mini-left">
            <img class="mini-thumb" id="mini-thumb" src="${DEFAULT_FALLBACK_COVER}" alt="Track artwork" />
            <div class="mini-info">
              <span class="mini-title" id="mini-title">CALLING MY PHONE</span>
              <span class="mini-artist" id="mini-artist">Lil Tjay feat. 6LACK</span>
            </div>
          </div>
          <div class="mini-actions">
            <button class="btn-circle-nav" id="btn-mini-play-pause" title="Play/Pause" style="width: 38px; height: 38px;">
              ${Icons.play(18)}
            </button>
            <button class="btn-circle-nav" id="btn-mini-next" title="Next Track" style="width: 38px; height: 38px;">
              ${Icons.skipForward(18)}
            </button>
          </div>
        </div>

        <!-- Floating Bottom Navigation Bar -->
        <nav class="floating-bottom-nav" id="floating-bottom-nav" style="display: none;">
          <button class="nav-tab-item active" data-tab="home" title="Home">
            ${Icons.home(22)}
            <span>Home</span>
          </button>
          <button class="nav-tab-item" data-tab="search" title="Search">
            ${Icons.search(22)}
            <span>Search</span>
          </button>
          <button class="nav-tab-item" data-tab="library" title="Library">
            ${Icons.library(22)}
            <span>Library</span>
          </button>
        </nav>

        <!-- Modals & Sheets Layer -->
        <div id="lyrics-modal-container"></div>
        <div id="auth-modal-container"></div>
        <div id="equalizer-modal-container"></div>
        <div id="queue-modal-container"></div>
      </div>
    `;

    // References
    this.onboardingContainer = document.querySelector('#onboarding-container');
    this.artistSelectContainer = document.querySelector('#artist-select-container');
    this.setupLoadingContainer = document.querySelector('#setup-loading-container');
    this.homeContainer = document.querySelector('#home-container');
    this.searchContainer = document.querySelector('#search-container');
    this.libraryContainer = document.querySelector('#library-container');
    this.playlistContainer = document.querySelector('#playlist-container');
    this.playerContainer = document.querySelector('#player-container');
    this.lyricsContainer = document.querySelector('#lyrics-modal-container');
    this.authContainer = document.querySelector('#auth-modal-container');
    this.equalizerContainer = document.querySelector('#equalizer-modal-container');
    this.queueContainer = document.querySelector('#queue-modal-container');
    this.bottomNav = document.querySelector('#floating-bottom-nav');
    this.miniPlayer = document.querySelector('#mini-player-bar');
  }

  initComponents() {
    // 1. Auth Modal
    this.authModal = renderAuthModal(this.authContainer, {
      onAuthSuccess: () => this.navigateTo('artist-select')
    });

    // 2. YouTube Music-style Lyrics Modal
    this.lyricsModal = renderLyricsModal(this.lyricsContainer, {
      audioEngine,
      onClose: () => {
        // If player is open, keep bottom nav hidden; if closed, show nav
        if (!this.isPlayerOpen && ['home', 'search', 'library'].includes(this.currentMainTab)) {
          this.bottomNav.style.display = 'flex';
        }
      }
    });

    // 3. Equalizer Modal with Live Web Audio Engine
    this.equalizerModal = renderEqualizerModal(this.equalizerContainer, { audioEngine });

    // 4. Queue / Up Next Sheet Modal
    this.queueModal = renderQueueModal(this.queueContainer, {
      audioEngine,
      onSelectTrack: () => {
        this.openPlayer(false);
      }
    });

    // 5. Onboarding View
    renderOnboardingView(this.onboardingContainer, {
      onSignUp: () => {
        history.pushState({ modal: 'auth' }, '');
        this.authModal.open('signup');
      },
      onLogIn: () => {
        history.pushState({ modal: 'auth' }, '');
        this.authModal.open('login');
      }
    });

    // 6. Artist Selection View
    renderArtistSelectView(this.artistSelectContainer, {
      onBack: () => history.back(),
      onComplete: () => this.startSetupLoading()
    });

    // 7. Home View (Deep feed)
    this.initHomeView();

    // 8. Search View
    renderSearchView(this.searchContainer, {
      audioEngine,
      onSelectTrack: (track) => {
        this.openPlayer();
      }
    });

    // 9. Library View (Custom Playlists & Device Music)
    renderLibraryView(this.libraryContainer, {
      audioEngine,
      onSelectTrack: (track) => {
        audioEngine.loadTrack(track, true);
        this.openPlayer();
      },
      onOpenPlaylist: (playlist) => {
        this.openPlaylist(playlist);
      }
    });

    // 10. Full Player View
    renderPlayerView(this.playerContainer, {
      audioEngine,
      onBack: () => history.back(),
      onOpenLyrics: () => {
        history.pushState({ modal: 'lyrics' }, '');
        this.bottomNav.style.display = 'none';
        this.lyricsModal.open();
      },
      onOpenQueue: () => {
        this.openQueueModal();
      },
      onOpenEqualizer: () => {
        history.pushState({ modal: 'equalizer' }, '');
        this.equalizerModal.open();
      }
    });

    // Listen to Firebase Auth state changes
    authService.subscribe((user, profile) => {
      if (this.homeContainer && (this.currentView === 'home' || this.currentMainTab === 'home')) {
        this.initHomeView();
      }
    });

    // Monitor Network Connectivity changes globally
    networkService.subscribe(({ isOnline }) => {
      if (!isOnline) {
        this.showToast('📶 You are offline. Downloaded & local tracks remain accessible.', false);
      }
    });

    // Spotify-style One-Time Onboarding:
    // If onboarding was already completed, open straight to Home dashboard!
    if (Storage.hasCompletedOnboarding()) {
      this.initHomeView();
      this.transitionToHome();
    } else {
      this.navigateTo('onboarding', false);
    }
  }

  initHomeView() {
    renderHomeView(this.homeContainer, {
      audioEngine,
      onSelectTrack: (track) => {
        audioEngine.loadTrack(track, true);
        this.openPlayer();
      },
      onOpenPlaylist: (playlist) => {
        this.openPlaylist(playlist);
      },
      onOpenEqualizer: () => {
        history.pushState({ modal: 'equalizer' }, '');
        this.equalizerModal.open();
      },
      onOpenPlayer: () => this.openPlayer(),
      onOpenAuth: () => {
        history.pushState({ modal: 'auth' }, '');
        this.authModal.open('signup');
      }
    });
  }

  openPlaylist(playlist, pushHistory = true) {
    if (pushHistory) {
      history.pushState({ view: 'playlist', playlistId: playlist.id }, '');
    }

    this.isPlaylistViewOpen = true;
    this.resetAllScroll();

    if (this.playlistContainer) {
      this.playlistContainer.style.display = 'block';
      this.playlistContainer.scrollTop = 0;
    }

    renderPlaylistView(this.playlistContainer, {
      playlist,
      audioEngine,
      onBack: () => history.back()
    });

    // Hide home tab container while mix playlist is active
    if (this.homeContainer) this.homeContainer.style.display = 'none';
    if (this.searchContainer) this.searchContainer.style.display = 'none';
    if (this.libraryContainer) this.libraryContainer.style.display = 'none';

    // Keep mini-player and bottomNav visible so user can seamlessly control music
    if (!this.isPlayerOpen) {
      this.miniPlayer.classList.remove('hidden');
      this.bottomNav.style.display = 'flex';
    }
  }

  closePlaylistView() {
    this.isPlaylistViewOpen = false;
    document.body.classList.remove('sheet-modal-open');
    document.querySelector('.device-frame')?.classList.remove('sheet-modal-open');
    if (this.playlistContainer) {
      this.playlistContainer.style.display = 'none';
      this.playlistContainer.innerHTML = '';
    }
    // Return to active tab
    this.switchMainTab(this.currentMainTab, false);
  }

  openQueueModal(pushHistory = true) {
    if (pushHistory) {
      history.pushState({ modal: 'queue' }, '');
    }
    this.queueModal.open();
  }

  startSetupLoading() {
    renderSetupLoadingView(this.setupLoadingContainer, {
      onComplete: () => {
        this.initHomeView();
        this.transitionToHome();
      }
    });
    this.navigateTo('setup-loading', false);
  }

  transitionToHome() {
    this.resetAllScroll();

    // 1. Prepare home container & home view with smooth animated entrance
    if (this.homeContainer) {
      this.homeContainer.style.display = 'block';
      this.homeContainer.scrollTop = 0;
    }

    const homeView = document.querySelector('#view-home');
    if (homeView) {
      homeView.classList.add('active');
      homeView.classList.remove('smooth-enter');
      // Force reflow to cleanly trigger CSS keyframe animation
      void homeView.offsetWidth;
      homeView.classList.add('smooth-enter');
      homeView.scrollTop = 0;
    }

    // 2. Prepare floating navigation and mini player with glide up
    this.bottomNav.style.display = 'flex';
    this.bottomNav.classList.remove('nav-enter-smooth');
    void this.bottomNav.offsetWidth;
    this.bottomNav.classList.add('nav-enter-smooth');

    this.miniPlayer.classList.remove('hidden');
    this.miniPlayer.classList.remove('mini-enter-smooth');
    void this.miniPlayer.offsetWidth;
    this.miniPlayer.classList.add('mini-enter-smooth');

    this.currentView = 'home';
    this.currentMainTab = 'home';
    // Replace history root to home
    history.replaceState({ root: true, view: 'home', tab: 'home' }, '');

    document.querySelectorAll('.nav-tab-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === 'home');
    });

    // 3. Smoothly cross-fade out the setup loading container over 450ms
    if (this.setupLoadingContainer) {
      this.setupLoadingContainer.style.transition = 'opacity 0.45s ease, transform 0.45s ease';
      this.setupLoadingContainer.style.opacity = '0';
      this.setupLoadingContainer.style.transform = 'scale(0.98)';
      setTimeout(() => {
        if (this.setupLoadingContainer) {
          this.setupLoadingContainer.style.display = 'none';
          this.setupLoadingContainer.style.opacity = '1';
          this.setupLoadingContainer.style.transform = 'none';
        }
      }, 450);
    }

    // Hide any other non-home containers
    [this.onboardingContainer, this.artistSelectContainer, this.searchContainer, this.libraryContainer, this.playerContainer, this.playlistContainer].forEach(c => {
      if (c && c !== this.homeContainer && c !== this.setupLoadingContainer) {
        c.style.display = 'none';
      }
    });
  }

  initGlobalEvents() {
    // Global Toast Notification Listener
    window.addEventListener('melo-toast', (e) => {
      if (e.detail) {
        this.showToast(e.detail.message, e.detail.isSuccess !== false);
      }
    });

    // Bottom Nav Tabs
    this.bottomNav.querySelectorAll('.nav-tab-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchMainTab(tab);
      });
    });

    // Mini Player Click -> Expand Full Player
    this.miniPlayer.addEventListener('click', (e) => {
      if (e.target.closest('#btn-mini-play-pause') || e.target.closest('#btn-mini-next')) return;
      this.openPlayer();
    });

    // Mini Player Play/Pause
    const miniPlayPause = document.querySelector('#btn-mini-play-pause');
    miniPlayPause.addEventListener('click', (e) => {
      e.stopPropagation();
      audioEngine.togglePlay();
    });

    // Mini Player Next
    const miniNext = document.querySelector('#btn-mini-next');
    miniNext.addEventListener('click', (e) => {
      e.stopPropagation();
      audioEngine.next();
    });

    // Audio Engine subscriptions for Mini Player
    const miniThumb = document.querySelector('#mini-thumb');
    const miniTitle = document.querySelector('#mini-title');
    const miniArtist = document.querySelector('#mini-artist');

    audioEngine.subscribe('trackChange', (track) => {
      miniThumb.src = track.cover || DEFAULT_FALLBACK_COVER;
      miniTitle.textContent = track.title;
      miniArtist.textContent = track.artist;
    });

    audioEngine.subscribe('playStateChange', ({ isPlaying }) => {
      miniPlayPause.innerHTML = isPlaying ? Icons.pause(18) : Icons.play(18);
    });

    audioEngine.subscribe('loadingChange', ({ isLoading }) => {
      if (isLoading) {
        miniPlayPause.innerHTML = `<div class="melo-mini-spinner"></div>`;
        miniArtist.textContent = 'Buffering studio stream...';
      } else {
        miniPlayPause.innerHTML = audioEngine.isPlaying ? Icons.pause(18) : Icons.play(18);
        miniArtist.textContent = audioEngine.currentTrack?.artist || '';
      }
    });
  }

  /**
   * Hardware 3-button & Gesture Navigation Handler
   * Responds to native Android back button and edge-swipe gestures
   */
  initHistory() {
    // Set initial baseline state
    history.replaceState({ root: true, view: this.currentView }, '');

    window.addEventListener('popstate', () => {
      // 1. If Queue Modal is open, close it
      if (this.queueModal && this.queueModal.isOpen()) {
        this.queueModal.close();
        return;
      }

      // 2. If Lyrics Modal is open, close it
      if (this.lyricsModal && this.lyricsModal.isOpen()) {
        this.lyricsModal.close();
        return;
      }

      // 3. If Equalizer Modal is open, close it
      if (this.equalizerModal && this.equalizerModal.isOpen()) {
        this.equalizerModal.close();
        return;
      }

      // 4. If Auth Modal is open, close it
      if (this.authModal && this.authModal.isOpen()) {
        this.authModal.close();
        return;
      }

      // 5. If Full Player is maximized, smoothly slide it down
      if (this.isPlayerOpen) {
        this.closePlayer(false);
        return;
      }

      // 6. If Playlist Detail View is open, close it and return to Home
      if (this.isPlaylistViewOpen) {
        this.closePlaylistView();
        return;
      }

      // 7. If currently on a sub-tab (Search or Library), return to Home tab
      if (this.currentMainTab && this.currentMainTab !== 'home') {
        this.switchMainTab('home', false);
        return;
      }

      // 8. If in Artist Selection during onboarding, return to Onboarding screen
      if (this.currentView === 'artist-select') {
        this.navigateTo('onboarding', false);
        return;
      }

      // 9. If already on Home page with nothing open:
      // We do NOT intercept or push new state! The browser / phone naturally exits the app.
    });
  }

  resetAllScroll() {
    window.scrollTo(0, 0);
    if (document.body) document.body.scrollTop = 0;
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (this.root) this.root.scrollTop = 0;
    const viewport = document.querySelector('#views-viewport');
    if (viewport) viewport.scrollTop = 0;
    const frame = document.querySelector('.device-frame');
    if (frame) frame.scrollTop = 0;
  }

  navigateTo(viewName, pushHistory = true) {
    this.resetAllScroll();
    this.currentView = viewName;

    if (pushHistory) {
      history.pushState({ view: viewName }, '');
    }

    const containers = [
      this.onboardingContainer,
      this.artistSelectContainer,
      this.setupLoadingContainer,
      this.homeContainer,
      this.searchContainer,
      this.libraryContainer,
      this.playlistContainer,
      this.playerContainer
    ];
    containers.forEach(c => {
      if (c) {
        c.style.display = 'none';
        c.scrollTop = 0;
      }
    });

    document.querySelectorAll('.view').forEach(v => {
      v.classList.remove('active');
      v.scrollTop = 0;
    });

    if (viewName === 'onboarding') {
      if (this.onboardingContainer) {
        this.onboardingContainer.style.display = 'block';
        this.onboardingContainer.scrollTop = 0;
      }
      const v = document.querySelector('#view-onboarding');
      if (v) {
        v.classList.add('active');
        v.scrollTop = 0;
      }
      this.bottomNav.style.display = 'none';
      this.miniPlayer.classList.add('hidden');
    } else if (viewName === 'artist-select') {
      if (this.artistSelectContainer) {
        this.artistSelectContainer.style.display = 'block';
        this.artistSelectContainer.scrollTop = 0;
      }
      const v = document.querySelector('#view-artist-select');
      if (v) {
        v.classList.add('active');
        v.scrollTop = 0;
      }
      this.bottomNav.style.display = 'none';
      this.miniPlayer.classList.add('hidden');
    } else if (viewName === 'setup-loading') {
      if (this.setupLoadingContainer) {
        this.setupLoadingContainer.style.display = 'block';
        this.setupLoadingContainer.scrollTop = 0;
      }
      const v = document.querySelector('#view-setup-loading');
      if (v) {
        v.classList.add('active');
        v.scrollTop = 0;
      }
      this.bottomNav.style.display = 'none';
      this.miniPlayer.classList.add('hidden');
    } else if (viewName === 'home' || viewName === 'search' || viewName === 'library') {
      this.bottomNav.style.display = 'flex';
      this.miniPlayer.classList.remove('hidden');
      this.switchMainTab(viewName, pushHistory);
    }
  }

  switchMainTab(tabName, pushHistory = true) {
    this.resetAllScroll();

    if (pushHistory && tabName !== 'home') {
      history.pushState({ tab: tabName }, '');
    }

    this.currentMainTab = tabName;
    this.currentView = tabName;

    // If playlist view was open and user tapped a nav tab, close playlist view
    if (this.isPlaylistViewOpen) {
      this.isPlaylistViewOpen = false;
      if (this.playlistContainer) this.playlistContainer.style.display = 'none';
    }

    document.querySelectorAll('.nav-tab-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    if (this.homeContainer) {
      this.homeContainer.style.display = tabName === 'home' ? 'block' : 'none';
      if (tabName === 'home') this.homeContainer.scrollTop = 0;
    }
    if (this.searchContainer) {
      this.searchContainer.style.display = tabName === 'search' ? 'block' : 'none';
      if (tabName === 'search') this.searchContainer.scrollTop = 0;
    }
    if (this.libraryContainer) {
      this.libraryContainer.style.display = tabName === 'library' ? 'block' : 'none';
      if (tabName === 'library') this.libraryContainer.scrollTop = 0;
    }

    const homeView = document.querySelector('#view-home');
    if (homeView) {
      homeView.classList.toggle('active', tabName === 'home');
      if (tabName === 'home') {
        homeView.classList.remove('smooth-enter');
        void homeView.offsetWidth;
        homeView.classList.add('smooth-enter');
      }
    }
    document.querySelector('#view-search')?.classList.toggle('active', tabName === 'search');
    document.querySelector('#view-library')?.classList.toggle('active', tabName === 'library');

    if (!this.isPlayerOpen) {
      this.miniPlayer.classList.remove('hidden');
      this.bottomNav.style.display = 'flex';
    }
  }

  /**
   * Smooth Slide-Up Full Player Expansion
   * Mini-player is completely hidden while maximized
   */
  openPlayer(pushHistory = true) {
    if (this.isPlayerOpen) return;
    this.isPlayerOpen = true;

    if (pushHistory) {
      history.pushState({ view: 'player' }, '');
    }

    // Mini-player and bottom navigation MUST NOT be visible when player is maximized
    this.miniPlayer.classList.add('hidden');
    this.bottomNav.style.display = 'none';

    if (this.playerContainer) {
      this.playerContainer.style.display = 'block';
      this.playerContainer.scrollTop = 0;
      // Force reflow to smoothly trigger slide-up transition
      void this.playerContainer.offsetWidth;
      this.playerContainer.classList.add('player-expanded');
    }

    const v = document.querySelector('#view-player');
    if (v) {
      v.classList.add('active');
      v.scrollTop = 0;
    }
  }

  /**
   * Smooth Slide-Down Full Player Minimization
   * Restores mini-player smoothly after transition completes
   */
  closePlayer(popHistory = false) {
    if (!this.isPlayerOpen) return;
    this.isPlayerOpen = false;

    if (popHistory) {
      history.back();
      return;
    }

    if (this.playerContainer) {
      this.playerContainer.classList.remove('player-expanded');
      // Wait for 440ms CSS transition before hiding container
      setTimeout(() => {
        if (!this.isPlayerOpen && this.playerContainer) {
          this.playerContainer.style.display = 'none';
          document.querySelector('#view-player')?.classList.remove('active');
          
          // Re-display mini player and bottom nav if on home/search/library/playlist
          if (['home', 'search', 'library'].includes(this.currentMainTab) || this.isPlaylistViewOpen) {
            this.miniPlayer.classList.remove('hidden');
            this.bottomNav.style.display = 'flex';
          }
        }
      }, 440);
    } else {
      if (['home', 'search', 'library'].includes(this.currentMainTab) || this.isPlaylistViewOpen) {
        this.miniPlayer.classList.remove('hidden');
        this.bottomNav.style.display = 'flex';
      }
    }
  }

  showToast(message, isSuccess = true) {
    const banner = document.querySelector('#global-toast-banner');
    if (!banner) return;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    banner.textContent = message;
    banner.style.background = isSuccess ? '#2E7D32' : '#D32F2F';
    banner.style.display = 'block';
    this.toastTimer = setTimeout(() => {
      banner.style.display = 'none';
    }, 3400);
  }
}

// Register Service Worker for PWA Offline Functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(() => {
      console.log('Melo PWA Service Worker active');
    }).catch(err => {
      console.warn('PWA Service Worker note:', err);
    });
  });
}

// Initialize Application
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
