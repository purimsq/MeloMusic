import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Heart,
  Search,
  Sliders,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  ListMusic,
  Plus,
  Home,
  Library,
  History,
  Sparkles,
  Check,
  Disc,
  Compass,
  X,
  Menu,
  Clock,
  Radio,
  Share2,
  Flame,
  ArrowLeft,
  LogOut,
  FolderHeart,
  Loader2,
  Music,
  Film,
  Trash2,
  Maximize2,
  Minimize2,
  RefreshCw,
  MoreVertical,
  ListPlus,
  FolderPlus,
  Mic2,
  MicOff
} from 'lucide-react';
import { CURATED_ARTISTS } from '../data/curatedArtists';
import { authService } from '../services/authService';
import { youtubeMusicService } from '../services/youtubeMusicService';
import { playerStore } from '../services/playerStore';
import { updateService } from '../services/updateService';
import { networkService } from '../services/networkService';
import { lyricsService } from '../services/lyricsService';
import { EqualizerModal } from './EqualizerModal';
import { YouTubePlayerHost } from './YouTubePlayerHost';
import { ManageArtistsModal } from './ManageArtistsModal';
import logoBadgeImg from '../assets/logo-badge.png';

function PlaylistCoverArt({ playlist, className = '' }) {
  if (!playlist) return null;
  const tracks = playlist.tracks || [];

  if (playlist.isLikedFolder) {
    return (
      <div className={`liked-folder-art ${className}`} style={{ width: '100%', height: '100%' }}>
        <Heart size={36} fill="#FFF" color="#FFF" />
      </div>
    );
  }

  // 4+ songs: 2x2 collage
  if (tracks.length >= 4) {
    return (
      <div className={`playlist-cover-collage ${className}`}>
        {tracks.slice(0, 4).map((t, idx) => (
          <img
            key={`pl-collage-${t.videoId || t.id}-${idx}`}
            src={t.cover}
            alt=""
            className="collage-tile"
          />
        ))}
      </div>
    );
  }

  // 1 to 3 songs: 1st song cover
  if (tracks.length >= 1 && tracks[0].cover) {
    return (
      <img
        src={tracks[0].cover}
        alt={playlist.title}
        className={`playlist-cover-single ${className}`}
      />
    );
  }

  // 0 songs: Soft & Cool Ceramic Mood Gradient Placeholder
  const palettes = [
    { bg: 'linear-gradient(135deg, #A8BBA2 0%, #6E8569 100%)', name: 'Sage' },
    { bg: 'linear-gradient(135deg, #B8B5C9 0%, #87829F 100%)', name: 'Lavender' },
    { bg: 'linear-gradient(135deg, #9AB3C5 0%, #5E7A90 100%)', name: 'Slate' },
    { bg: 'linear-gradient(135deg, #D6C7B7 0%, #A6927E 100%)', name: 'Sand' },
    { bg: 'linear-gradient(135deg, #CFA393 0%, #A5705E 100%)', name: 'Terracotta' },
    { bg: 'linear-gradient(135deg, #A7B1AA 0%, #6E7C74 100%)', name: 'Pebble' },
  ];
  const charCode = (playlist.title || 'M').charCodeAt(0) || 0;
  const p = palettes[charCode % palettes.length];

  return (
    <div
      className={`playlist-cover-placeholder ${className}`}
      style={{ background: p.bg }}
    >
      <div className="placeholder-ceramic-emboss">
        <Disc size={26} color="#FFFFFF" strokeWidth={1.8} />
        <span className="placeholder-letter">{(playlist.title || 'P').charAt(0).toUpperCase()}</span>
      </div>
    </div>
  );
}

function YoutubeIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
        fill="#FF0000"
      />
      <polygon points="9.545,15.568 15.818,12 9.545,8.432" fill="#FFFFFF" />
    </svg>
  );
}

// Active singing line pill with smooth auto-marquee for long verses (keeps container sleek & compact)
function StageLyricPill({ text, activeLyricIndex }) {
  const trackRef = useRef(null);
  const textRef = useRef(null);
  const [overflowData, setOverflowData] = useState({ isOverflowing: false, dist: 0, duration: 6 });

  useEffect(() => {
    const track = trackRef.current;
    const textEl = textRef.current;
    if (!track || !textEl) return;

    const measure = () => {
      // Compare full unclipped scrollWidth against inner viewport clientWidth
      const diff = textEl.scrollWidth - track.clientWidth;
      if (diff > 4) {
        const dist = diff + 14;
        const duration = Math.max(5.5, (diff / 24) + 3.2);
        setOverflowData({ isOverflowing: true, dist, duration });
      } else {
        setOverflowData({ isOverflowing: false, dist: 0, duration: 6 });
      }
    };

    const rafId = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', measure);
    };
  }, [text, activeLyricIndex]);

  return (
    <div
      className={`stage-lyric-pill ${overflowData.isOverflowing ? 'is-overflowing' : ''}`}
      key={`stage-curr-${activeLyricIndex}`}
      title={text}
      style={
        overflowData.isOverflowing
          ? {
              '--marquee-dist': `-${overflowData.dist}px`,
              '--marquee-duration': `${overflowData.duration}s`
            }
          : undefined
      }
    >
      <div className="stage-lyric-scroll-track" ref={trackRef}>
        <span
          ref={textRef}
          className={`stage-lyric-text ${overflowData.isOverflowing ? 'is-marquee' : ''}`}
        >
          {text}
        </span>
      </div>
    </div>
  );
}

function renderHighlightedQuery(fullText, typedQuery) {
  if (!typedQuery || !fullText) return <span>{fullText || ''}</span>;
  const lowerFull = fullText.toLowerCase();
  const lowerTyped = typedQuery.toLowerCase();
  const idx = lowerFull.indexOf(lowerTyped);
  if (idx === -1) return <span>{fullText}</span>;
  const before = fullText.slice(0, idx);
  const matched = fullText.slice(idx, idx + typedQuery.length);
  const after = fullText.slice(idx + typedQuery.length);
  return (
    <span className="suggest-highlighted-text">
      {before && <span className="sugg-dim">{before}</span>}
      <span className="sugg-dim">{matched}</span>
      {after && <strong className="sugg-bold">{after}</strong>}
    </span>
  );
}

export function MainAppView({ userProfile, onSignOut }) {
  // Navigation & Page State
  const [activeNav, setActiveNav] = useState('home');
  const [navHistory, setNavHistory] = useState([{ nav: 'home' }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Layout & Dock States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(true);
  const [dockTab, setDockTab] = useState('upnext'); // 'upnext' | 'lyrics' | 'related'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHudVisible, setIsHudVisible] = useState(true);
  const hudTimeoutRef = useRef(null);
  const [isEqualizerOpen, setIsEqualizerOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Saved Session: Restore track, queue, position on app launch (Spotify behavior)
  const savedSession = useRef(playerStore.getPlaybackSession()).current;
  const isRestoredSessionRef = useRef(!!savedSession?.currentTrack);
  const saveSessionDebounceRef = useRef(null);

  // Playback & YouTube Player State
  const [currentTrack, setCurrentTrack] = useState(savedSession?.currentTrack || null);
  const [hasPlayedTrack, setHasPlayedTrack] = useState(!!savedSession?.currentTrack);
  const [isPlaying, setIsPlaying] = useState(false); // ALWAYS starts paused on restore
  const [currentTime, setCurrentTime] = useState(savedSession?.currentTime || 0);
  const [duration, setDuration] = useState(savedSession?.duration || 0);
  const [volume, setVolume] = useState(playerStore.getSettings().volume ?? 0.85);
  const [isMuted, setIsMuted] = useState(playerStore.getSettings().isMuted ?? false);
  const [playerMode, setPlayerMode] = useState(savedSession?.playerMode || playerStore.getSettings().playerMode || 'song'); // 'song' by default | 'video'
  const [isSongKaraokeMode, setIsSongKaraokeMode] = useState(false);
  const stageKaraokeContainerRef = useRef(null);
  const userScrolledKaraokeRef = useRef(false);
  const karaokeScrollTimeoutRef = useRef(null);
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);
  const [repeatMode, setRepeatMode] = useState(playerStore.getSettings().repeatMode || 'all'); // 'off' | 'all' | 'one'
  const [isShuffle, setIsShuffle] = useState(playerStore.getSettings().isShuffle || false);
  const [queue, setQueue] = useState(savedSession?.queue || []);
  const [queueIndex, setQueueIndex] = useState(savedSession?.queueIndex || 0);
  const [ytPlayer, setYtPlayer] = useState(null);
  const ytPlayerRef = useRef(ytPlayer);
  ytPlayerRef.current = ytPlayer;

  // Live Lyrics State (Synchronized LRC Karaoke + Plain Text Fallback)
  const [lyricsData, setLyricsData] = useState(null);
  const [isLyricsLoading, setIsLyricsLoading] = useState(false);
  const lyricsContainerRef = useRef(null);
  const userScrolledLyricsRef = useRef(false);
  const userScrollTimeoutRef = useRef(null);

  // Auto-Update State
  const [updateInfo, setUpdateInfo] = useState(() => updateService.getState());

  // Real Internet Connectivity State (Active Ping Monitor)
  const [isOnline, setIsOnline] = useState(() => networkService.isOnline);

  useEffect(() => {
    const unsubscribe = networkService.subscribe(({ isOnline: online }) => {
      setIsOnline(online);
    });
    return () => unsubscribe();
  }, []);

  // Silent Audio Anchor to permanently bridge top-level window to Windows SMTC (Seelen UI, Taskbar, Volume flyout)
  const silentAudioRef = useRef(null);
  useEffect(() => {
    // Generate an in-memory 1-second silent WAV blob so it loops smoothly with zero CPU or decode overhead
    let silentUrl = null;
    try {
      const sampleRate = 8000;
      const numSamples = 8000;
      const buffer = new Uint8Array(44 + numSamples);
      const view = new DataView(buffer.buffer);
      view.setUint32(0, 0x52494646, false); // RIFF
      view.setUint32(4, 36 + numSamples, true);
      view.setUint32(8, 0x57415645, false); // WAVE
      view.setUint32(12, 0x666d7420, false); // fmt 
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, 1, true); // Mono
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate, true); // ByteRate
      view.setUint16(32, 1, true); // BlockAlign
      view.setUint16(34, 8, true); // 8-bit
      view.setUint32(36, 0x64617461, false); // data
      view.setUint32(40, numSamples, true);
      buffer.fill(128, 44);
      const blob = new Blob([buffer], { type: 'audio/wav' });
      silentUrl = URL.createObjectURL(blob);

      const audio = new Audio(silentUrl);
      audio.loop = true;
      audio.volume = 0.001;
      silentAudioRef.current = audio;
    } catch (e) {
      console.warn('Silent audio init notice:', e);
    }

    return () => {
      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
        silentAudioRef.current = null;
      }
      if (silentUrl) {
        try { URL.revokeObjectURL(silentUrl); } catch {}
      }
    };
  }, []);

  // Keep top-level OS Audio session in exact sync with playback state
  useEffect(() => {
    const audio = silentAudioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // Live YouTube Feeds
  const [homeFeed, setHomeFeed] = useState({ quickPicks: [], topHits: [], recommendedVideos: [] });
  const [isHomeLoading, setIsHomeLoading] = useState(true);
  const [activeMood, setActiveMood] = useState('All');
  const [moodTracks, setMoodTracks] = useState([]);
  const [isMoodLoading, setIsMoodLoading] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('all');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState(playerStore.getSearchHistory());
  const [searchSuggestions, setSearchSuggestions] = useState({ queries: [], items: [] });
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const profileWrapperRef = useRef(null);

  // Close search dropdown & profile menu when clicking outside
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchDropdownOpen(false);
      }
      if (profileWrapperRef.current && !profileWrapperRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  // Artist Profile State
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [artistProfile, setArtistProfile] = useState(null);
  const [isArtistLoading, setIsArtistLoading] = useState(false);

  // Album Detail State
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [albumDetails, setAlbumDetails] = useState(null);
  const [isAlbumLoading, setIsAlbumLoading] = useState(false);

  // Library & Playlists State
  const [likedSongs, setLikedSongs] = useState(playerStore.getLikedSongs());
  const [playlists, setPlaylists] = useState(playerStore.getPlaylists());
  const [recentActivity, setRecentActivity] = useState(playerStore.getRecentActivity());
  const [libraryFilter, setLibraryFilter] = useState('All');
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [isNewPlaylistModalOpen, setIsNewPlaylistModalOpen] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [playlistTrackSearch, setPlaylistTrackSearch] = useState('');
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);

  // Track 3-Dots Context Menu
  const [trackMenu, setTrackMenu] = useState(null); // { track, x, y }

  // Add to Playlist Modal
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState(null);
  const [modalNewPlTitle, setModalNewPlTitle] = useState('');
  const [isCreatingInModal, setIsCreatingInModal] = useState(false);

  // Save Whole Queue to Playlist Modal
  const [isSaveQueueModalOpen, setIsSaveQueueModalOpen] = useState(false);
  const [selectedQueuePlaylistId, setSelectedQueuePlaylistId] = useState(null);
  const [modalNewQueuePlTitle, setModalNewQueuePlTitle] = useState('');
  const [isCreatingQueuePl, setIsCreatingQueuePl] = useState(false);
  const [isSavingQueue, setIsSavingQueue] = useState(false);

  // 2-Step Sign Out Confirmation Modal
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [signOutStatus, setSignOutStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'failed'

  // In-Playlist Live Search & Add
  const [playlistAddSearch, setPlaylistAddSearch] = useState('');
  const [playlistAddResults, setPlaylistAddResults] = useState([]);
  const [isPlaylistAddSearching, setIsPlaylistAddSearching] = useState(false);

  // YouTube-Style Drag & Scrub State for Top Seek Bar
  const [isScrubbing, setIsScrubbing] = useState(false);
  const isScrubbingRef = useRef(false);
  const justScrubbedRef = useRef(false);
  const isSeekingRef = useRef(false);
  const seekSettleTimeoutRef = useRef(null);
  const [scrubFraction, setScrubFraction] = useState(0);
  const wasPlayingBeforeScrubRef = useRef(false);
  const progressEdgeRef = useRef(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState('');
  const toastTimeoutRef = useRef(null);

  // Related tracks for the current playing track
  const [relatedTracks, setRelatedTracks] = useState([]);
  const [isRelatedLoading, setIsRelatedLoading] = useState(false);
  const isReplenishingRef = useRef(false);

  // User details
  const userName = userProfile?.displayName || userProfile?.name || 'Listener';
  const [userArtists, setUserArtists] = useState(() => {
    const favs = authService.getFavoriteArtists();
    return favs && favs.length > 0 ? favs : CURATED_ARTISTS.slice(0, 7);
  });

  // State for in-app artist updater modal
  const [isArtistModalOpen, setIsArtistModalOpen] = useState(false);
  const [isSavingArtists, setIsSavingArtists] = useState(false);

  // Refs for bulletproof queue navigation and autoplay (no stale closures)
  const queueRef = useRef(queue);
  queueRef.current = queue;

  const queueIndexRef = useRef(queueIndex);
  queueIndexRef.current = queueIndex;

  const repeatModeRef = useRef(repeatMode);
  repeatModeRef.current = repeatMode;

  const currentTrackRef = useRef(currentTrack);
  currentTrackRef.current = currentTrack;

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  const durationRef = useRef(duration);
  durationRef.current = duration;

  const lastSessionSaveTimeRef = useRef(0);

  // Refs for YouTube Music style queue auto-scrolling
  const rightDockRef = useRef(null);
  const activeQueueItemRef = useRef(null);

  // Auto-scroll queue so currently playing track appears at the top of the queue view (YouTube Music behavior)
  useEffect(() => {
    if (dockTab !== 'upnext') return;

    const timer = setTimeout(() => {
      if (rightDockRef.current && activeQueueItemRef.current) {
        const dock = rightDockRef.current;
        const item = activeQueueItemRef.current;
        const headerEl = dock.querySelector('.dock-top-header');
        const headerHeight = headerEl ? headerEl.offsetHeight : 52;

        const targetScrollTop = Math.max(0, item.offsetTop - headerHeight);

        dock.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        });
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [queueIndex, dockTab, currentTrack?.videoId]);

  // Transition guard to prevent intermediate buffering/pause state from canceling autoplay
  const isTransitioningRef = useRef(false);
  const transitionTimeoutRef = useRef(null);
  const markTransitioning = () => {
    isTransitioningRef.current = true;
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = setTimeout(() => {
      isTransitioningRef.current = false;
    }, 4500);
  };

  // Explicit user-requested pause tracker: avoids getting trapped when YouTube fires state 2 while buffering or changing tracks
  // If we restored a saved session, initialize as true so the cued track stays paused until user clicks play
  const userRequestedPauseRef = useRef(!!savedSession?.currentTrack);

  // Fullscreen HUD Auto-Hide Idle Timer (YouTube behavior)
  const resetHudTimer = () => {
    setIsHudVisible(true);
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    if (isFullscreen && isPlaying && !isScrubbingRef.current) {
      hudTimeoutRef.current = setTimeout(() => {
        setIsHudVisible(false);
      }, 2800);
    }
  };

  useEffect(() => {
    if (!isFullscreen) {
      setIsHudVisible(true);
      if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
      return;
    }

    resetHudTimer();

    const handleUserActivity = () => {
      resetHudTimer();
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('mousedown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);

    return () => {
      if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
    };
  }, [isFullscreen, isPlaying]);

  // YouTube-Style Keyboard Seeking (Left / Right Arrow) with Accumulator Feedback
  const [seekFeedback, setSeekFeedback] = useState({
    visible: false,
    direction: 'forward', // 'forward' | 'backward'
    seconds: 5,
    animKey: 0
  });
  const seekAccumulatorRef = useRef({
    direction: null,
    seconds: 0,
    lastTime: 0
  });
  const seekFeedbackTimerRef = useRef(null);

  const handleArrowSeek = (direction) => {
    const curTrack = currentTrackRef.current || currentTrack;
    if (!curTrack) return;

    const now = Date.now();
    const isSameDirection = seekAccumulatorRef.current.direction === direction;
    const isRecent = now - seekAccumulatorRef.current.lastTime < 950;
    const prevSeconds = seekAccumulatorRef.current.seconds || 0;

    // Accumulate seconds (5 -> 10 -> 15...) when clicking rapidly in the same direction
    let newSeconds = 5;
    if (isSameDirection && isRecent && prevSeconds > 0) {
      newSeconds = prevSeconds + 5;
    } else {
      newSeconds = 5;
    }

    seekAccumulatorRef.current = {
      direction,
      seconds: newSeconds,
      lastTime: now
    };

    const delta = direction === 'forward' ? 5 : -5;
    const curTime = currentTimeRef.current ?? currentTime ?? 0;
    const dur = durationRef.current ?? duration ?? 0;
    const targetTime = Math.max(0, Math.min(dur > 0 ? dur : 999999, curTime + delta));

    currentTimeRef.current = targetTime;
    setCurrentTime(targetTime);

    const player = ytPlayerRef.current || ytPlayer;
    if (player && typeof player.seekTo === 'function') {
      try {
        player.seekTo(targetTime, true);
      } catch {}
    }

    isSeekingRef.current = true;
    if (seekSettleTimeoutRef.current) clearTimeout(seekSettleTimeoutRef.current);
    seekSettleTimeoutRef.current = setTimeout(() => {
      isSeekingRef.current = false;
    }, 750);

    // Wake up HUD in fullscreen so user sees the progress bar move
    resetHudTimer();

    // Trigger visual seek feedback badge
    setSeekFeedback({
      visible: true,
      direction,
      seconds: newSeconds,
      animKey: now
    });

    if (seekFeedbackTimerRef.current) clearTimeout(seekFeedbackTimerRef.current);
    seekFeedbackTimerRef.current = setTimeout(() => {
      setSeekFeedback((prev) => ({ ...prev, visible: false }));
      seekAccumulatorRef.current = { direction: null, seconds: 0, lastTime: 0 };
    }, 850);
  };

  // Fullscreen toggle handler with browser Fullscreen API synchronization
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
      if (activeNav !== 'now-playing') {
        navigateTo('now-playing');
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      const isNowFs = !!document.fullscreenElement;
      setIsFullscreen(isNowFs);
      if (isNowFs && activeNav !== 'now-playing') {
        navigateTo('now-playing');
      }
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, [activeNav]);

  // Fullscreen view lock: ensure that while in fullscreen, activeNav stays pinned to 'now-playing'
  useEffect(() => {
    if (isFullscreen && activeNav !== 'now-playing') {
      setActiveNav('now-playing');
    }
  }, [isFullscreen, activeNav]);

  // Dynamic Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Toast Helper
  const showToast = (msg) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(''), 3200);
  };

  // Update Service: Subscribe to update changes and perform silent background check on launch (Spotify behavior)
  useEffect(() => {
    const unsubscribe = updateService.subscribe((state) => {
      setUpdateInfo(state);
    });

    // Check once in the background upon launch
    updateService.checkOnLaunch((foundState) => {
      showToast(`New update available (v${foundState.version}) • Click profile to update`);
    });

    return () => unsubscribe();
  }, []);

  // Update Action Handler
  const handleTriggerUpdate = () => {
    if (updateInfo.status === 'checking' || updateInfo.status === 'downloading' || updateInfo.status === 'verifying') {
      return;
    }
    if (updateInfo.status === 'ready') {
      showToast('Restarting MUSE to install update...');
      persistPlaybackSession();
      setTimeout(() => {
        updateService.startDownloadAndInstall();
      }, 120);
      return;
    }
    if (updateInfo.status === 'error') {
      showToast('Retrying update download...');
      persistPlaybackSession();
      updateService.startDownloadAndInstall();
      return;
    }
    if (updateInfo.hasUpdate) {
      persistPlaybackSession();
      updateService.startDownloadAndInstall();
    } else {
      updateService.checkForUpdates(true).then((hasNew) => {
        if (hasNew) {
          showToast(`New update available (v${updateService.latestVersion || updateInfo.version || '1.0.4'}) • Click profile to update`);
        } else {
          showToast(`MUSE is up to date (v${updateInfo.currentVersion || '1.0.4'})`);
        }
      }).catch(() => {
        showToast(`MUSE is up to date (v${updateInfo.currentVersion || '1.0.4'})`);
      });
    }
  };

  // Spotify-Style Session Persistence (Track, Queue, Exact Position, Mode)
  const persistPlaybackSession = (customCurTime = null, trackOverride = null, queueOverride = null, indexOverride = null) => {
    const track = trackOverride || currentTrackRef.current;
    if (!track) return;
    const timeToSave = customCurTime !== null ? customCurTime : (currentTimeRef.current || 0);
    const qToSave = queueOverride || queueRef.current || [];
    const idxToSave = (indexOverride !== null && indexOverride !== undefined) ? indexOverride : (queueIndexRef.current || 0);
    playerStore.savePlaybackSession({
      currentTrack: track,
      currentTime: timeToSave,
      duration: durationRef.current || duration || 0,
      queue: qToSave,
      queueIndex: idxToSave,
      playerMode,
      savedAt: Date.now()
    });
  };

  // Immediate and debounced session auto-save on state transitions
  useEffect(() => {
    if (!currentTrack) return;
    if (saveSessionDebounceRef.current) clearTimeout(saveSessionDebounceRef.current);
    saveSessionDebounceRef.current = setTimeout(() => {
      persistPlaybackSession();
    }, 300);
  }, [currentTrack, queue, queueIndex, playerMode, duration]);

  // Window unload persistence (in case app closes suddenly / window closed)
  useEffect(() => {
    const handleUnload = () => {
      persistPlaybackSession();
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  // YouTube-style Scrubber calculations and drag listeners
  const calculateFraction = (clientX) => {
    if (!progressEdgeRef.current) return 0;
    const rect = progressEdgeRef.current.getBoundingClientRect();
    const pos = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(1, pos));
  };

  const handleScrubStart = (e) => {
    e.stopPropagation();
    if (e.button !== undefined && e.button !== 0) return;
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    if (clientX === undefined) return;
    const frac = calculateFraction(clientX);
    justScrubbedRef.current = true;
    isScrubbingRef.current = true;
    setIsScrubbing(true);
    setScrubFraction(frac);
    setCurrentTime(Math.floor(frac * duration));
    wasPlayingBeforeScrubRef.current = isPlaying;
  };

  useEffect(() => {
    if (!isScrubbing) return;

    const handleScrubMove = (e) => {
      const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
      if (clientX === undefined) return;
      const frac = calculateFraction(clientX);
      setScrubFraction(frac);
      setCurrentTime(Math.floor(frac * duration));
    };

    const handleScrubEnd = (e) => {
      const clientX = e.changedTouches && e.changedTouches.length > 0
        ? e.changedTouches[0].clientX
        : e.touches && e.touches.length > 0
        ? e.touches[0].clientX
        : e.clientX;
      const frac = clientX !== undefined ? calculateFraction(clientX) : scrubFraction;
      const targetTime = Math.floor(frac * duration);

      isScrubbingRef.current = false;
      setIsScrubbing(false);
      setCurrentTime(targetTime);

      // Seek settling guard: prevent stale YouTube polling from reverting time for 700ms
      isSeekingRef.current = true;
      if (seekSettleTimeoutRef.current) clearTimeout(seekSettleTimeoutRef.current);
      seekSettleTimeoutRef.current = setTimeout(() => {
        isSeekingRef.current = false;
      }, 700);

      if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
        try {
          ytPlayer.seekTo(targetTime, true);
        } catch {}
      }

      // Resume playing if was playing prior to drag
      if (wasPlayingBeforeScrubRef.current) {
        setIsPlaying(true);
        if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
          try {
            ytPlayer.playVideo();
          } catch {}
        }
      }

      // Block any synthetic click events on footer from minimizing player
      setTimeout(() => {
        justScrubbedRef.current = false;
      }, 450);
    };

    window.addEventListener('mousemove', handleScrubMove);
    window.addEventListener('mouseup', handleScrubEnd);
    window.addEventListener('touchmove', handleScrubMove);
    window.addEventListener('touchend', handleScrubEnd);

    return () => {
      window.removeEventListener('mousemove', handleScrubMove);
      window.removeEventListener('mouseup', handleScrubEnd);
      window.removeEventListener('touchmove', handleScrubMove);
      window.removeEventListener('touchend', handleScrubEnd);
    };
  }, [isScrubbing, duration, ytPlayer, scrubFraction]);

  // Subscribe to PlayerStore updates
  useEffect(() => {
    const unsubscribe = playerStore.subscribe((eventType, payload) => {
      if (eventType === 'likedChange') {
        const updatedLiked = playerStore.getLikedSongs();
        setLikedSongs(updatedLiked);
        if (payload?.message) showToast(payload.message);
        setSelectedPlaylist((prev) => {
          if (!prev || !prev.isLikedFolder) return prev;
          return { ...prev, tracks: updatedLiked };
        });
      } else if (eventType === 'playlistsChange') {
        const updated = playerStore.getPlaylists();
        setPlaylists(updated);
        setSelectedPlaylist((prev) => {
          if (!prev || prev.isLikedFolder) return prev;
          return updated.find((p) => p.id === prev.id) || prev;
        });
      } else if (eventType === 'recentChange') {
        setRecentActivity(playerStore.getRecentActivity());
      } else if (eventType === 'searchHistoryChange') {
        setSearchHistory(payload?.searchHistory || playerStore.getSearchHistory());
      }
    });
    return () => unsubscribe();
  }, []);

  // Load Curated Home Feed from YouTube Music (supports dynamic refresh)
  const loadFeed = async (artistsToUse = userArtists, priorityNames = []) => {
    setIsHomeLoading(true);
    try {
      const feed = await youtubeMusicService.getHomeFeed(artistsToUse, priorityNames);
      setHomeFeed({ ...feed });
    } catch (err) {
      console.warn('Home feed load warning:', err);
    } finally {
      setIsHomeLoading(false);
    }
  };

  // Initial Load: Real Home Feed
  useEffect(() => {
    loadFeed(userArtists);
  }, []);

  // Handler for pausing playback from in-app artist update confirm
  const handlePausePlayback = () => {
    userRequestedPauseRef.current = true;
    setIsPlaying(false);
    const activePlayer = ytPlayerRef.current || ytPlayer;
    if (activePlayer && typeof activePlayer.pauseVideo === 'function') {
      try {
        activePlayer.pauseVideo();
      } catch (e) {
        console.warn('Could not pause ytPlayer:', e);
      }
    }
    persistPlaybackSession();
  };

  // Handler for saving updated artists from in-app modal
  const handleSaveArtists = async (updatedList, addedArtists = []) => {
    setIsSavingArtists(true);
    try {
      // Reorder so newly added artists appear at the front of userArtists list,
      // guaranteeing immediate visibility in the circular shelf and sidebar
      const addedKeys = new Set(
        (addedArtists || []).map((a) => (typeof a === 'string' ? a : a?.id || a?.name || '').toLowerCase())
      );
      const newlyAdded = (updatedList || []).filter((a) =>
        addedKeys.has((typeof a === 'string' ? a : a?.id || a?.name || '').toLowerCase())
      );
      const existing = (updatedList || []).filter(
        (a) => !addedKeys.has((typeof a === 'string' ? a : a?.id || a?.name || '').toLowerCase())
      );
      const orderedList = [...newlyAdded, ...existing];

      authService.setFavoriteArtists(orderedList);
      setUserArtists([...orderedList]);

      const priorityNames = newlyAdded
        .map((a) => (typeof a === 'string' ? a : a?.name || ''))
        .filter(Boolean);

      // Return to home screen and reset mood to All so refreshed feed is in front of user
      navigateTo('home');
      setActiveMood('All');
      setSelectedArtist(null);

      // Regenerate feed in background with priority given to newly added artists
      await loadFeed(orderedList, priorityNames);

      // Smooth scroll stage and carousels to the start
      setTimeout(() => {
        const stage = document.querySelector('.desktop-center-stage');
        if (stage) stage.scrollTo({ top: 0, behavior: 'smooth' });
        const qpTrack = document.getElementById('quick-picks-track');
        if (qpTrack) qpTrack.scrollTo({ left: 0, behavior: 'smooth' });
        const shelfTrack = document.querySelector('.artists-circular-shelf');
        if (shelfTrack) shelfTrack.scrollTo({ left: 0, behavior: 'smooth' });
      }, 50);
    } catch (err) {
      console.error('Failed to update favorite artists:', err);
    } finally {
      setIsSavingArtists(false);
    }
  };

  // Helper: Direct seek to timestamp (used by lyrics line clicks and scrubber)
  const handleSeekToTime = (targetSeconds) => {
    const clamped = Math.max(0, Math.min(targetSeconds, duration || 0));
    setCurrentTime(clamped);
    isSeekingRef.current = true;
    if (seekSettleTimeoutRef.current) clearTimeout(seekSettleTimeoutRef.current);
    seekSettleTimeoutRef.current = setTimeout(() => {
      isSeekingRef.current = false;
    }, 700);

    const player = ytPlayerRef.current || ytPlayer;
    if (player && typeof player.seekTo === 'function') {
      try {
        player.seekTo(clamped, true);
      } catch (e) {
        console.warn('Seek error:', e);
      }
    }
  };

  // Derive active lyric line index based on playback currentTime
  const activeLyricIndex = useMemo(() => {
    if (!lyricsData?.lines || lyricsData.type !== 'synced') return -1;
    return lyricsService.getActiveLineIndex(lyricsData.lines, currentTime);
  }, [lyricsData, currentTime]);

  // Check if current track has playable/readable lyrics
  const hasLyrics = useMemo(() => {
    return Boolean(
      lyricsData &&
      ((lyricsData.type === 'synced' && lyricsData.lines?.length > 0) ||
       (lyricsData.type === 'plain' && lyricsData.text?.trim()))
    );
  }, [lyricsData]);

  // If lyrics become unavailable, smoothly fallback from karaoke to cover view
  useEffect(() => {
    if (!isLyricsLoading && !hasLyrics && isSongKaraokeMode) {
      setIsSongKaraokeMode(false);
    }
  }, [hasLyrics, isLyricsLoading, isSongKaraokeMode]);

  // Lock active lyric line at 25% from top inside Queue Dock lyrics scroller
  const scrollToActiveDockLyric = useCallback((isInstant = false) => {
    if (dockTab !== 'lyrics' || activeLyricIndex < 0) return;
    if (!isInstant && userScrolledLyricsRef.current) return;

    const container = lyricsContainerRef.current;
    if (!container) return;
    const activeEl = container.querySelector(`.lyrics-line[data-index="${activeLyricIndex}"]`);
    if (!activeEl) return;

    const containerRect = container.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    if (containerRect.height <= 0 || activeRect.height <= 0) return;

    // Anchor active lyric line at 25% from the top of the lyrics dock container
    const targetOffsetFromTop = (containerRect.height * 0.25) - (activeRect.height / 2);
    const targetScrollTop =
      container.scrollTop +
      (activeRect.top - containerRect.top) -
      targetOffsetFromTop;

    container.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: isInstant ? 'auto' : 'smooth'
    });
  }, [activeLyricIndex, dockTab]);

  // Smooth scroll progression during active singing in lyrics dock
  useEffect(() => {
    if (dockTab !== 'lyrics' || activeLyricIndex < 0 || userScrolledLyricsRef.current) return;
    scrollToActiveDockLyric(false);
  }, [activeLyricIndex, dockTab, scrollToActiveDockLyric]);

  // Instantly lock and anchor active lyric at 25% when switching to lyrics tab or toggling queue
  useEffect(() => {
    if (dockTab !== 'lyrics' || activeLyricIndex < 0) return;
    userScrolledLyricsRef.current = false;

    scrollToActiveDockLyric(true);
    const rafId = requestAnimationFrame(() => {
      scrollToActiveDockLyric(true);
    });
    const t = setTimeout(() => {
      scrollToActiveDockLyric(true);
    }, 70);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t);
    };
  }, [dockTab, isQueueOpen, scrollToActiveDockLyric]);

  // Pause auto-scroll when user manually scrolls lyrics; resumes after 3.5s of inactivity
  const handleLyricsUserScroll = () => {
    userScrolledLyricsRef.current = true;
    if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
    userScrollTimeoutRef.current = setTimeout(() => {
      userScrolledLyricsRef.current = false;
    }, 3500);
  };

  // Handle clicking on any lyric line to jump directly to that point in the song
  const handleLyricLineClick = (lineTime) => {
    userScrolledLyricsRef.current = false;
    userScrolledKaraokeRef.current = false;
    handleSeekToTime(lineTime);
  };

  // Auto-center active singing line inside Song Stage Karaoke view with buttery-smooth mathematical scrolling
  const scrollToActiveKaraokeLine = useCallback((isInstant = false) => {
    if (!isSongKaraokeMode || activeLyricIndex < 0) return;
    if (!isInstant && userScrolledKaraokeRef.current) return;

    const container = stageKaraokeContainerRef.current;
    if (!container) return;
    const activeEl = container.querySelector(`.stage-karaoke-line[data-index="${activeLyricIndex}"]`);
    if (!activeEl) return;

    const containerRect = container.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    if (containerRect.height <= 0 || activeRect.height <= 0) return;

    const targetScrollTop =
      container.scrollTop +
      (activeRect.top - containerRect.top) -
      (containerRect.height / 2) +
      (activeRect.height / 2);

    container.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: isInstant ? 'auto' : 'smooth'
    });
  }, [activeLyricIndex, isSongKaraokeMode]);

  // Smooth scroll progression during active singing
  useEffect(() => {
    if (!isSongKaraokeMode || activeLyricIndex < 0 || userScrolledKaraokeRef.current) return;
    scrollToActiveKaraokeLine(false);
  }, [activeLyricIndex, isSongKaraokeMode, scrollToActiveKaraokeLine]);

  // Instantly lock and center active lyric when toggling fullscreen or switching to karaoke (eliminates glitch & delay)
  useEffect(() => {
    if (!isSongKaraokeMode || activeLyricIndex < 0) return;
    userScrolledKaraokeRef.current = false;

    scrollToActiveKaraokeLine(true);
    const rafId = requestAnimationFrame(() => {
      scrollToActiveKaraokeLine(true);
    });
    const t1 = setTimeout(() => {
      scrollToActiveKaraokeLine(true);
    }, 60);
    const t2 = setTimeout(() => {
      scrollToActiveKaraokeLine(true);
    }, 180);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isFullscreen, isSongKaraokeMode, scrollToActiveKaraokeLine]);

  // Maintain precise centering on window resize
  useEffect(() => {
    if (!isSongKaraokeMode) return;
    const handleResize = () => {
      scrollToActiveKaraokeLine(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSongKaraokeMode, scrollToActiveKaraokeLine]);

  const handleStageKaraokeUserScroll = () => {
    userScrolledKaraokeRef.current = true;
    if (karaokeScrollTimeoutRef.current) clearTimeout(karaokeScrollTimeoutRef.current);
    karaokeScrollTimeoutRef.current = setTimeout(() => {
      userScrolledKaraokeRef.current = false;
    }, 3500);
  };

  // Asynchronously fetch lyrics in background when current track changes
  useEffect(() => {
    if (!currentTrack?.videoId && !currentTrack?.title) {
      setLyricsData(null);
      return;
    }

    let isCurrent = true;
    setIsLyricsLoading(true);

    lyricsService
      .getLyrics(currentTrack)
      .then((data) => {
        if (isCurrent) {
          setLyricsData(data);
          setIsLyricsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Lyrics fetch warning:', err);
        if (isCurrent) {
          setLyricsData({ type: 'none', isSynced: false, message: 'No lyrics available for this track' });
          setIsLyricsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [currentTrack?.videoId, currentTrack?.title, currentTrack?.artist]);

  // Mood filter change
  useEffect(() => {
    if (activeMood === 'All') {
      setMoodTracks([]);
      return;
    }
    let isCancelled = false;
    async function loadMood() {
      setIsMoodLoading(true);
      try {
        const tracks = await youtubeMusicService.getMoodFeed(activeMood);
        if (!isCancelled) setMoodTracks(tracks);
      } catch (err) {
        console.warn('Mood tracks error:', err);
      } finally {
        if (!isCancelled) setIsMoodLoading(false);
      }
    }
    loadMood();
    return () => {
      isCancelled = true;
    };
  }, [activeMood]);

  // Live Search & Autocomplete Suggestions Effect (Debounced 240ms)
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearchSuggestions({ queries: [], items: [] });
      setIsSearching(false);
      setIsSuggestionsLoading(false);
      return;
    }
    setIsSearching(true);
    setIsSuggestionsLoading(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const [results, sugg] = await Promise.all([
          youtubeMusicService.search(q, searchFilter),
          youtubeMusicService.getSearchSuggestions(q)
        ]);
        setSearchResults(results || []);
        setSearchSuggestions(sugg || { queries: [], items: [] });
      } catch (err) {
        console.warn('Live search error:', err);
      } finally {
        setIsSearching(false);
        setIsSuggestionsLoading(false);
      }
    }, 240);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, searchFilter]);

  // Record Recent Track when track plays for at least 3 seconds
  useEffect(() => {
    if (isPlaying && currentTrack && currentTime >= 3) {
      playerStore.recordRecentTrack(currentTrack);
    }
  }, [currentTrack, currentTime, isPlaying]);

  // Load Related Tracks when currentTrack changes
  useEffect(() => {
    if (!currentTrack?.videoId) return;
    let isCancelled = false;
    async function fetchRelated() {
      setIsRelatedLoading(true);
      try {
        const related = await youtubeMusicService.search(`${currentTrack.artist} ${currentTrack.title} music`);
        if (!isCancelled) {
          setRelatedTracks(related.slice(0, 10));
        }
      } catch {}
      finally {
        if (!isCancelled) setIsRelatedLoading(false);
      }
    }
    fetchRelated();
    return () => {
      isCancelled = true;
    };
  }, [currentTrack?.videoId]);

  // Infinite Queue Replenishment: when near end of queue, fetch more radio tracks
  useEffect(() => {
    if (!hasPlayedTrack || queue.length === 0) return;
    if (queueIndex >= queue.length - 3 && !isReplenishingRef.current && currentTrack?.videoId) {
      isReplenishingRef.current = true;
      youtubeMusicService.getRadioQueue(currentTrack.videoId, currentTrack).then((extra) => {
        if (extra && extra.length > 0) {
          setQueue((prevQueue) => {
            const existingIds = new Set(prevQueue.map((t) => t.videoId));
            const newOnes = extra.filter((t) => !existingIds.has(t.videoId));
            return newOnes.length > 0 ? [...prevQueue, ...newOnes] : prevQueue;
          });
        }
        isReplenishingRef.current = false;
      }).catch(() => {
        isReplenishingRef.current = false;
      });
    }
  }, [queueIndex, queue.length, hasPlayedTrack, currentTrack]);

  // History Navigation helper
  const navigateTo = (navName, extraState = {}) => {
    const newState = { nav: navName, ...extraState };
    setNavHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, newState];
    });
    setHistoryIndex((prev) => prev + 1);
    setActiveNav(navName);
    if (extraState.selectedArtist !== undefined) setSelectedArtist(extraState.selectedArtist);
    if (extraState.selectedPlaylist !== undefined) setSelectedPlaylist(extraState.selectedPlaylist);
    if (extraState.selectedAlbum !== undefined) setSelectedAlbum(extraState.selectedAlbum);
  };

  const handleNavBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const targetState = navHistory[newIndex];
      setHistoryIndex(newIndex);
      setActiveNav(targetState.nav);
      if (targetState.selectedArtist !== undefined) setSelectedArtist(targetState.selectedArtist);
      if (targetState.selectedPlaylist !== undefined) setSelectedPlaylist(targetState.selectedPlaylist);
      if (targetState.selectedAlbum !== undefined) setSelectedAlbum(targetState.selectedAlbum);
    }
  };

  const handleNavForward = () => {
    if (historyIndex < navHistory.length - 1) {
      const newIndex = historyIndex + 1;
      const targetState = navHistory[newIndex];
      setHistoryIndex(newIndex);
      setActiveNav(targetState.nav);
      if (targetState.selectedArtist !== undefined) setSelectedArtist(targetState.selectedArtist);
      if (targetState.selectedPlaylist !== undefined) setSelectedPlaylist(targetState.selectedPlaylist);
      if (targetState.selectedAlbum !== undefined) setSelectedAlbum(targetState.selectedAlbum);
    }
  };

  // Toggle player maximize / minimize
  const handleTogglePlayerExpand = () => {
    setIsSearchDropdownOpen(false);
    if (isFullscreen) return; // Never minimize while in fullscreen
    if (isScrubbingRef.current || justScrubbedRef.current) return; // Never minimize during or immediately after seeking
    if (activeNav === 'now-playing') {
      for (let i = historyIndex - 1; i >= 0; i--) {
        if (navHistory[i] && navHistory[i].nav !== 'now-playing') {
          const target = navHistory[i];
          setHistoryIndex(i);
          setActiveNav(target.nav);
          if (target.selectedArtist !== undefined) setSelectedArtist(target.selectedArtist);
          if (target.selectedPlaylist !== undefined) setSelectedPlaylist(target.selectedPlaylist);
          if (target.selectedAlbum !== undefined) setSelectedAlbum(target.selectedAlbum);
          return;
        }
      }
      navigateTo('home');
    } else {
      navigateTo('now-playing');
    }
  };

  // Play Track & Fetch Real Radio Queue (with automatic replenishment for short playlists)
  const handlePlayTrack = async (track, switchViewToPlayer = false, customQueue = null) => {
    if (!track) return;
    userRequestedPauseRef.current = false;
    markTransitioning();

    // Defensively resolve videoId so no track ever fails with undefined ID
    const resolvedVideoId = track.videoId || track.youtubeId || (typeof track.id === 'string' && track.id.startsWith('yt-') ? track.id.replace('yt-', '') : track.id);
    const normalizedTrack = {
      ...track,
      videoId: resolvedVideoId
    };

    // Unlock audio context immediately within user click gesture
    try {
      const unlockAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
      unlockAudio.volume = 0.001;
      unlockAudio.play().catch(() => {});
    } catch {}

    // If clicking the song that is currently playing, restart from beginning
    if (currentTrack?.videoId === normalizedTrack.videoId && ytPlayer && typeof ytPlayer.seekTo === 'function') {
      setCurrentTime(0);
      try {
        ytPlayer.seekTo(0, true);
        ytPlayer.playVideo();
      } catch {}
      setIsPlaying(true);
      if (switchViewToPlayer) navigateTo('now-playing');
      return;
    }

    // Direct synchronous play in user click gesture
    if (ytPlayer && typeof ytPlayer.loadVideoById === 'function' && normalizedTrack.videoId) {
      try {
        ytPlayer.loadVideoById(normalizedTrack.videoId, 0);
        ytPlayer.playVideo();
      } catch (err) {
        console.warn('Direct YT play error:', err);
      }
    }

    // Set duration immediately from track metadata so progress bar and time indicator display instantly
    if (normalizedTrack.duration && Number(normalizedTrack.duration) > 0) {
      setDuration(Number(normalizedTrack.duration));
    }

    setCurrentTrack(normalizedTrack);
    currentTrackRef.current = normalizedTrack;
    setHasPlayedTrack(true);
    setIsPlaying(true);
    setCurrentTime(0);

    const initialQ = (customQueue && Array.isArray(customQueue) && customQueue.length > 0)
      ? customQueue
      : [normalizedTrack];
    const initialTargetIdx = (customQueue && Array.isArray(customQueue) && customQueue.length > 0)
      ? Math.max(0, customQueue.findIndex((t) => (t.videoId && t.videoId === normalizedTrack.videoId) || t.id === normalizedTrack.id))
      : 0;

    persistPlaybackSession(0, normalizedTrack, initialQ, initialTargetIdx);

    if (customQueue && Array.isArray(customQueue) && customQueue.length > 0) {
      setQueue(customQueue);
      queueRef.current = customQueue;
      setQueueIndex(initialTargetIdx);
      queueIndexRef.current = initialTargetIdx;

      // If the playlist or queue is short (<= 8 tracks), automatically fetch YouTube recommendations to append
      if (customQueue.length <= 8 && normalizedTrack.videoId) {
        youtubeMusicService.getRadioQueue(normalizedTrack.videoId, normalizedTrack).then((extra) => {
          if (extra && extra.length > 0) {
            setQueue((prevQueue) => {
              const existingIds = new Set(prevQueue.map((t) => t.videoId || t.id));
              const newOnes = extra.filter((t) => !existingIds.has(t.videoId || t.id));
              const merged = newOnes.length > 0 ? [...prevQueue, ...newOnes] : prevQueue;
              queueRef.current = merged;
              persistPlaybackSession(null, normalizedTrack, merged, initialTargetIdx);
              return merged;
            });
          }
        }).catch(() => {});
      }
    } else {
      // Set current track as initial queue, then fetch 50-track YouTube Music Radio
      setQueue([normalizedTrack]);
      queueRef.current = [normalizedTrack];
      setQueueIndex(0);
      queueIndexRef.current = 0;
      try {
        const fullRadio = await youtubeMusicService.getRadioQueue(normalizedTrack.videoId, normalizedTrack);
        if (fullRadio && fullRadio.length > 0) {
          setQueue(fullRadio);
          queueRef.current = fullRadio;
          persistPlaybackSession(0, normalizedTrack, fullRadio, 0);
        }
      } catch (err) {
        console.warn('Radio queue fetch error:', err);
      }
    }

    if (switchViewToPlayer) {
      navigateTo('now-playing');
    }
  };

  // Master Play/Pause Toggle with explicit user intention tracking
  const handleTogglePlay = () => {
    const activeTrack = currentTrackRef.current || currentTrack;
    if (!activeTrack) {
      if (homeFeed.quickPicks && homeFeed.quickPicks[0]) {
        handlePlayTrack(homeFeed.quickPicks[0], true);
      }
      return;
    }

    if (isPlayingRef.current) {
      userRequestedPauseRef.current = true;
      setIsPlaying(false);
      persistPlaybackSession();
      if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
        try { ytPlayer.pauseVideo(); } catch {}
      }
    } else {
      userRequestedPauseRef.current = false;
      setIsPlaying(true);
      if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
        try { ytPlayer.playVideo(); } catch {}
      }
    }
  };



  // Close modals & context menus on Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (addToPlaylistTrack) {
          setAddToPlaylistTrack(null);
        } else if (showSignOutModal && signOutStatus === 'idle') {
          setShowSignOutModal(false);
        } else if (isSaveQueueModalOpen) {
          setIsSaveQueueModalOpen(false);
        } else if (trackMenu) {
          setTrackMenu(null);
        } else if (isNewPlaylistModalOpen) {
          setIsNewPlaylistModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [addToPlaylistTrack, showSignOutModal, signOutStatus, isSaveQueueModalOpen, trackMenu, isNewPlaylistModalOpen]);

  // Skip Next / Prev with Auto-Replenishment on End
  const handleNextTrack = async (isManual = false) => {
    const q = queueRef.current;
    const curIdx = queueIndexRef.current;
    const repMode = repeatModeRef.current;
    const curTrk = currentTrackRef.current;

    if (!q || q.length === 0) return;
    userRequestedPauseRef.current = false;
    markTransitioning();

    const player = ytPlayerRef.current || ytPlayer;
    if (!isManual && repMode === 'one' && curTrk) {
      if (player && typeof player.seekTo === 'function') {
        player.seekTo(0, true);
        player.playVideo();
      }
      setCurrentTime(0);
      setIsPlaying(true);
      return;
    }

    let nextIdx = curIdx + 1;

    // Approaching or at end of queue
    if (nextIdx >= q.length) {
      if (repMode === 'all') {
        nextIdx = 0;
      } else {
        // Auto-Replenish: fetch more tracks from YouTube Music recommendations/radio
        try {
          const trackToRadio = q[curIdx] || curTrk;
          if (trackToRadio?.videoId) {
            const extra = await youtubeMusicService.getRadioQueue(trackToRadio.videoId, trackToRadio);
            const existingIds = new Set(q.map((t) => t.videoId || t.id));
            const newOnes = (extra || []).filter((t) => !existingIds.has(t.videoId || t.id));
            if (newOnes.length > 0) {
              const updatedQueue = [...q, ...newOnes];
              setQueue(updatedQueue);
              queueRef.current = updatedQueue;
              setQueueIndex(nextIdx);
              queueIndexRef.current = nextIdx;
              const nextRaw = updatedQueue[nextIdx];
              const nextResolvedId = nextRaw.videoId || nextRaw.youtubeId || (typeof nextRaw.id === 'string' && nextRaw.id.startsWith('yt-') ? nextRaw.id.replace('yt-', '') : nextRaw.id);
              const nextTrk = { ...nextRaw, videoId: nextResolvedId };
              setCurrentTrack(nextTrk);
              currentTrackRef.current = nextTrk;
              if (nextTrk.duration && Number(nextTrk.duration) > 0) {
                setDuration(Number(nextTrk.duration));
              }
              setIsPlaying(true);
              setCurrentTime(0);
              persistPlaybackSession(0, nextTrk, updatedQueue, nextIdx);
              if (ytPlayer && typeof ytPlayer.loadVideoById === 'function' && nextTrk.videoId) {
                try {
                  ytPlayer.loadVideoById(nextTrk.videoId, 0);
                  ytPlayer.playVideo();
                } catch (err) {}
              }
              return;
            }
          }
        } catch (err) {
          console.warn('Auto replenish on end error:', err);
        }
        return;
      }
    }

    setQueueIndex(nextIdx);
    queueIndexRef.current = nextIdx;
    const nextRaw = q[nextIdx];
    const nextResolvedId = nextRaw.videoId || nextRaw.youtubeId || (typeof nextRaw.id === 'string' && nextRaw.id.startsWith('yt-') ? nextRaw.id.replace('yt-', '') : nextRaw.id);
    const nextTrk = { ...nextRaw, videoId: nextResolvedId };
    setCurrentTrack(nextTrk);
    currentTrackRef.current = nextTrk;
    if (nextTrk.duration && Number(nextTrk.duration) > 0) {
      setDuration(Number(nextTrk.duration));
    }
    setIsPlaying(true);
    setCurrentTime(0);
    persistPlaybackSession(0, nextTrk, q, nextIdx);
    if (ytPlayer && typeof ytPlayer.loadVideoById === 'function' && nextTrk.videoId) {
      try {
        ytPlayer.loadVideoById(nextTrk.videoId, 0);
        ytPlayer.playVideo();
      } catch (err) {}
    }
  };

  const handlePrevTrack = () => {
    const q = queueRef.current;
    const curIdx = queueIndexRef.current;
    const player = ytPlayerRef.current || ytPlayer;

    if (((currentTimeRef.current || 0) > 4 || currentTime > 4) && player && typeof player.seekTo === 'function') {
      player.seekTo(0, true);
      setCurrentTime(0);
      return;
    }
    if (!q || q.length === 0) return;
    userRequestedPauseRef.current = false;
    markTransitioning();
    let prevIdx = curIdx - 1;
    if (prevIdx < 0) {
      prevIdx = q.length - 1;
    }
    setQueueIndex(prevIdx);
    queueIndexRef.current = prevIdx;
    const prevRaw = q[prevIdx];
    const prevResolvedId = prevRaw.videoId || prevRaw.youtubeId || (typeof prevRaw.id === 'string' && prevRaw.id.startsWith('yt-') ? prevRaw.id.replace('yt-', '') : prevRaw.id);
    const prevTrk = { ...prevRaw, videoId: prevResolvedId };
    setCurrentTrack(prevTrk);
    currentTrackRef.current = prevTrk;
    if (prevTrk.duration && Number(prevTrk.duration) > 0) {
      setDuration(Number(prevTrk.duration));
    }
    setIsPlaying(true);
    setCurrentTime(0);
    persistPlaybackSession(0, prevTrk, q, prevIdx);
    if (ytPlayer && typeof ytPlayer.loadVideoById === 'function' && prevTrk.videoId) {
      try {
        ytPlayer.loadVideoById(prevTrk.videoId, 0);
        ytPlayer.playVideo();
      } catch (err) {}
    }
  };

  // Audio / Video Switcher with Official Video Resolution, Timestamp Preservation and Spinner
  const handleSwitchPlayerMode = async (newMode) => {
    if (newMode === playerMode) return;
    setIsSwitchingMode(true);
    const savedTime = currentTime;
    setPlayerMode(newMode);
    playerStore.updateSettings({ playerMode: newMode });

    if (newMode === 'video' && currentTrack) {
      try {
        const officialVidId = await youtubeMusicService.findOfficialVideo(currentTrack);
        if (officialVidId && officialVidId !== currentTrack.videoId) {
          setCurrentTrack((prev) => ({
            ...prev,
            videoId: officialVidId,
            officialVideoId: officialVidId,
            isVideo: true
          }));
        }
      } catch (err) {
        console.warn('Official video resolution error:', err);
      }
    }

    if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
      try {
        ytPlayer.seekTo(savedTime, true);
        ytPlayer.playVideo();
      } catch {}
    }

    setTimeout(() => {
      setIsSwitchingMode(false);
    }, 450);
  };

  // Volume & Mute
  const handleVolumeChange = (newVal) => {
    const v = Math.max(0, Math.min(1, Number(newVal)));
    setVolume(v);
    setIsMuted(false);
    playerStore.updateSettings({ volume: v, isMuted: false });
    const player = ytPlayerRef.current || ytPlayer;
    if (player && typeof player.setVolume === 'function') {
      player.setVolume(Math.round(v * 100));
      player.unMute();
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    playerStore.updateSettings({ isMuted: nextMuted });
    const player = ytPlayerRef.current || ytPlayer;
    if (player) {
      if (nextMuted && typeof player.mute === 'function') player.mute();
      else if (!nextMuted && typeof player.unMute === 'function') player.unMute();
    }
    showToast(nextMuted ? 'Muted' : `Volume: ${Math.round(volume * 100)}%`);
  };

  // Fine-grained volume adjustment with immediate toast feedback
  const adjustVolume = useCallback((delta) => {
    setVolume((prev) => {
      const nextVol = Math.max(0, Math.min(1, Math.round((prev + delta) * 100) / 100));
      setIsMuted(false);
      playerStore.updateSettings({ volume: nextVol, isMuted: false });
      const player = ytPlayerRef.current || ytPlayer;
      if (player && typeof player.setVolume === 'function') {
        try {
          player.setVolume(Math.round(nextVol * 100));
          player.unMute();
        } catch {}
      }
      showToast(`Volume: ${Math.round(nextVol * 100)}%`);
      return nextVol;
    });
  }, [ytPlayer]);

  // Comprehensive Global Keyboard Shortcuts & Media Controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const activeTag = activeEl ? activeEl.tagName.toLowerCase() : '';
      const isTextEntry =
        activeTag === 'textarea' ||
        activeEl?.isContentEditable ||
        (activeTag === 'input' && !['button', 'submit', 'checkbox', 'radio'].includes(activeEl.type?.toLowerCase()));

      if (isTextEntry) {
        return;
      }

      // Allow native volume range slider adjustments if volume slider is actively focused
      if (activeTag === 'input' && activeEl?.type === 'range') {
        return;
      }

      const isSpace = e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar' || e.keyCode === 32;
      const isFKey = e.key === 'f' || e.key === 'F';
      const isArrowLeft = e.key === 'ArrowLeft' || e.code === 'ArrowLeft';
      const isArrowRight = e.key === 'ArrowRight' || e.code === 'ArrowRight';
      const isArrowUp = e.key === 'ArrowUp' || e.code === 'ArrowUp' || e.key === 'AudioVolumeUp';
      const isArrowDown = e.key === 'ArrowDown' || e.code === 'ArrowDown' || e.key === 'AudioVolumeDown';

      // 1. Shift + Right Arrow -> Next Song (tied to Next Button)
      if (e.shiftKey && isArrowRight) {
        e.preventDefault();
        e.stopPropagation();
        handleNextTrack(true);
        return;
      }

      // 2. Shift + Left Arrow -> Previous Song (tied to Previous Button)
      if (e.shiftKey && isArrowLeft) {
        e.preventDefault();
        e.stopPropagation();
        handlePrevTrack();
        return;
      }

      // 3. Up Arrow -> Increase Audio Volume
      if (isArrowUp) {
        e.preventDefault();
        e.stopPropagation();
        adjustVolume(0.05);
        return;
      }

      // 4. Down Arrow -> Decrease Audio Volume
      if (isArrowDown) {
        e.preventDefault();
        e.stopPropagation();
        adjustVolume(-0.05);
        return;
      }

      // 5. Left Arrow (without Shift) -> Seek Backward 5s
      if (isArrowLeft) {
        e.preventDefault();
        e.stopPropagation();
        handleArrowSeek('backward');
        return;
      }

      // 6. Right Arrow (without Shift) -> Seek Forward 5s
      if (isArrowRight) {
        e.preventDefault();
        e.stopPropagation();
        handleArrowSeek('forward');
        return;
      }

      // 7. Spacebar -> Play / Pause
      if (isSpace) {
        e.preventDefault();
        e.stopPropagation();
        handleTogglePlay();
        return;
      }

      // 8. F -> Toggle Fullscreen
      if (isFKey) {
        const cur = currentTrackRef.current || currentTrack;
        if (!cur) return;
        e.preventDefault();
        e.stopPropagation();
        handleToggleFullscreen();
        return;
      }

      // 9. Escape -> Exit Fullscreen
      if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        e.stopPropagation();
        handleToggleFullscreen();
        return;
      }

      // 10. Hardware Audio Mute Key
      if (e.key === 'AudioVolumeMute') {
        e.preventDefault();
        e.stopPropagation();
        handleToggleMute();
        return;
      }

      // 11. Hardware Media Keys
      if (e.key === 'MediaTrackNext') {
        e.preventDefault();
        handleNextTrack(true);
        return;
      }
      if (e.key === 'MediaTrackPrevious') {
        e.preventDefault();
        handlePrevTrack();
        return;
      }
      if (e.key === 'MediaPlayPause') {
        e.preventDefault();
        handleTogglePlay();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isFullscreen, isPlaying, currentTrack, ytPlayer, adjustVolume]);

  // Stable refs for OS MediaSession action dispatchers
  const handlePrevTrackRef = useRef(handlePrevTrack);
  handlePrevTrackRef.current = handlePrevTrack;
  const handleNextTrackRef = useRef(handleNextTrack);
  handleNextTrackRef.current = handleNextTrack;
  const handleSeekToTimeRef = useRef(handleSeekToTime);
  handleSeekToTimeRef.current = handleSeekToTime;

  // Synchronize OS Media Session Metadata & Action Handlers (SMTC for Seelen UI, Windows Settings, Lock Screen)
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title || 'MUSE Track',
        artist: currentTrack.artist || 'MUSE Artist',
        album: currentTrack.album || 'MUSE Master',
        artwork: currentTrack.cover
          ? [
              { src: currentTrack.cover, sizes: '96x96' },
              { src: currentTrack.cover, sizes: '128x128' },
              { src: currentTrack.cover, sizes: '256x256' },
              { src: currentTrack.cover, sizes: '512x512' }
            ]
          : []
      });

      // Explicit Play (from Seelen UI, Windows Sound Settings, or Lock Screen)
      navigator.mediaSession.setActionHandler('play', () => {
        userRequestedPauseRef.current = false;
        setIsPlaying(true);
        try { navigator.mediaSession.playbackState = 'playing'; } catch {}
        if (silentAudioRef.current) {
          silentAudioRef.current.play().catch(() => {});
        }
        const player = ytPlayerRef.current;
        if (player && typeof player.playVideo === 'function') {
          try { player.playVideo(); } catch {}
        }
      });

      // Explicit Pause (from Seelen UI, Windows Sound Settings, or Lock Screen)
      navigator.mediaSession.setActionHandler('pause', () => {
        userRequestedPauseRef.current = true;
        setIsPlaying(false);
        try { navigator.mediaSession.playbackState = 'paused'; } catch {}
        if (silentAudioRef.current) {
          silentAudioRef.current.pause();
        }
        persistPlaybackSession();
        const player = ytPlayerRef.current;
        if (player && typeof player.pauseVideo === 'function') {
          try { player.pauseVideo(); } catch {}
        }
      });

      // Explicit Stop
      navigator.mediaSession.setActionHandler('stop', () => {
        userRequestedPauseRef.current = true;
        setIsPlaying(false);
        try { navigator.mediaSession.playbackState = 'paused'; } catch {}
        if (silentAudioRef.current) {
          silentAudioRef.current.pause();
        }
        persistPlaybackSession();
        const player = ytPlayerRef.current;
        if (player && typeof player.pauseVideo === 'function') {
          try { player.pauseVideo(); } catch {}
        }
      });

      // Previous Track
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (handlePrevTrackRef.current) handlePrevTrackRef.current();
      });

      // Next Track
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (handleNextTrackRef.current) handleNextTrackRef.current(true);
      });

      // Timeline Seeking (Seelen UI scrubber or Windows flyout)
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && details.seekTime !== null) {
          if (handleSeekToTimeRef.current) handleSeekToTimeRef.current(details.seekTime);
        }
      });

      // Seek Backward
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const sec = details.seekOffset || 5;
        if (handleSeekToTimeRef.current) {
          handleSeekToTimeRef.current(Math.max(0, (currentTimeRef.current || 0) - sec));
        }
      });

      // Seek Forward
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const sec = details.seekOffset || 5;
        if (handleSeekToTimeRef.current) {
          handleSeekToTimeRef.current(Math.min(durationRef.current || 0, (currentTimeRef.current || 0) + sec));
        }
      });
    } catch (e) {
      console.warn('MediaSession notice:', e);
    }
  }, [currentTrack]);

  // Keep OS playbackState synchronized whenever isPlaying state changes
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch {}
  }, [isPlaying]);

  // Synchronize OS Media Session Progress Bar / Timeline State (for Seelen UI / Windows Flyout)
  useEffect(() => {
    if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
    if (!duration || duration <= 0 || isNaN(duration)) return;

    try {
      navigator.mediaSession.setPositionState({
        duration: Math.max(1, duration),
        playbackRate: 1,
        position: Math.min(Math.max(0, currentTime || 0), duration)
      });
    } catch (e) {}
  }, [currentTime, duration]);

  // Open Artist Profile
  const handleOpenArtistProfile = async (artist) => {
    if (!artist) return;
    setSelectedArtist(artist);
    navigateTo('artist-profile', { selectedArtist: artist });
    setIsArtistLoading(true);
    try {
      const profile = await youtubeMusicService.getArtistProfile(artist.name, artist.browseId);
      setArtistProfile(profile);
    } catch (err) {
      console.warn('Artist profile fetch error:', err);
    } finally {
      setIsArtistLoading(false);
    }
  };

  // Open Album Detail View
  const handleOpenAlbum = async (album, artistName = '') => {
    if (!album) return;
    const resolvedArtist = artistName || artistProfile?.name || selectedArtist?.name || album.artist || 'Artist';
    const albumPayload = {
      ...album,
      artist: resolvedArtist
    };
    setSelectedAlbum(albumPayload);
    setAlbumDetails(null);
    navigateTo('album-detail', { selectedAlbum: albumPayload });
    setIsAlbumLoading(true);
    try {
      const details = await youtubeMusicService.getAlbumDetails(album.title, resolvedArtist, album.browseId);
      setAlbumDetails(details);
    } catch (err) {
      console.warn('Album details fetch error:', err);
    } finally {
      setIsAlbumLoading(false);
    }
  };

  // Open Playlist Detail
  const handleOpenPlaylist = (pl) => {
    setSelectedPlaylist(pl);
    setPlaylistTrackSearch('');
    navigateTo('playlist-detail', { selectedPlaylist: pl });
  };

  // Create Playlist (with smooth loading state)
  const handleCreatePlaylistSubmit = async (e) => {
    e.preventDefault();
    if (!newPlaylistTitle.trim() || isCreatingPlaylist) return;
    setIsCreatingPlaylist(true);

    // Realistic brief loading delay so user sees smooth animated feedback
    await new Promise((resolve) => setTimeout(resolve, 650));

    try {
      const pl = playerStore.createPlaylist(newPlaylistTitle, newPlaylistDesc);
      setIsNewPlaylistModalOpen(false);
      setNewPlaylistTitle('');
      setNewPlaylistDesc('');
      showToast(`Created playlist "${pl.title}"`);
      handleOpenPlaylist(pl);
    } catch (err) {
      console.error('Error creating playlist:', err);
      showToast('Error creating playlist');
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  // Delete Playlist
  const handleDeletePlaylist = (playlist) => {
    if (!playlist || playlist.isLikedFolder) return;
    if (window.confirm(`Are you sure you want to delete "${playlist.title}"?`)) {
      playerStore.deletePlaylist(playlist.id);
      showToast(`Deleted playlist "${playlist.title}"`);
      setSelectedPlaylist(null);
      navigateTo('library');
    }
  };

  // Remove single track from playlist
  const handleRemoveTrackFromPlaylist = (track) => {
    if (!selectedPlaylist || selectedPlaylist.isLikedFolder || !track) return;
    const trackId = track.videoId || track.id;
    playerStore.removeTrackFromPlaylist(selectedPlaylist.id, trackId);
    showToast(`Removed "${track.title}" from playlist`);
  };

  // Format total duration for playlist
  const formatPlaylistDuration = (tracks) => {
    if (!tracks || tracks.length === 0) return '0 min';
    let totalSec = 0;
    for (const t of tracks) {
      if (typeof t.duration === 'number' && !isNaN(t.duration)) {
        totalSec += t.duration;
      } else if (typeof t.durationFormatted === 'string') {
        const parts = t.durationFormatted.split(':').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          totalSec += parts[0] * 60 + parts[1];
        } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
          totalSec += parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
      }
    }
    if (totalSec === 0) return `${tracks.length} tracks`;
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  };

  // Play Next: Insert song immediately after current playing track in queue
  const handlePlayNext = (track) => {
    if (!track) return;
    const normalized = {
      ...track,
      id: track.id || track.videoId,
      videoId: track.videoId || track.id,
      durationFormatted: track.durationFormatted || '3:30'
    };
    setQueue((prevQueue) => {
      const newQ = [...prevQueue];
      const insertIndex = queueIndex + 1;
      newQ.splice(insertIndex, 0, normalized);
      queueRef.current = newQ;
      persistPlaybackSession(null, currentTrack, newQ, queueIndex);
      return newQ;
    });
    showToast(`Will play next: "${track.title}"`);
  };

  // Move an existing track inside the active queue to play next after current track
  const handleMoveQueueTrackToPlayNext = (targetIdx) => {
    setQueue((prevQueue) => {
      if (!prevQueue || targetIdx < 0 || targetIdx >= prevQueue.length) return prevQueue;
      const curIdx = queueIndexRef.current;
      if (targetIdx === curIdx) {
        showToast('This track is currently playing');
        return prevQueue;
      }
      if (targetIdx === curIdx + 1) {
        showToast(`"${prevQueue[targetIdx]?.title || 'Track'}" is already next`);
        return prevQueue;
      }

      const newQ = [...prevQueue];
      const [movedItem] = newQ.splice(targetIdx, 1);

      // If removed item was before current track, curIdx shifts left by 1
      let adjustedCurIdx = curIdx;
      if (targetIdx < curIdx) {
        adjustedCurIdx = curIdx - 1;
      }

      // Insert immediately after the current playing track
      const insertIdx = adjustedCurIdx + 1;
      newQ.splice(insertIdx, 0, movedItem);

      // Update refs and state cleanly
      setQueueIndex(adjustedCurIdx);
      queueIndexRef.current = adjustedCurIdx;
      queueRef.current = newQ;
      persistPlaybackSession(null, currentTrackRef.current, newQ, adjustedCurIdx);
      showToast(`Moved "${movedItem.title}" to play next`);
      return newQ;
    });
  };

  // Add to Queue: Append song to the bottom of the active queue
  const handleAddToQueue = (track) => {
    if (!track) return;
    const normalized = {
      ...track,
      id: track.id || track.videoId,
      videoId: track.videoId || track.id,
      durationFormatted: track.durationFormatted || '3:30'
    };
    setQueue((prevQueue) => {
      const newQ = [...prevQueue, normalized];
      queueRef.current = newQ;
      persistPlaybackSession(null, currentTrack, newQ, queueIndex);
      return newQ;
    });
    showToast(`Added to queue: "${track.title}"`);
  };

  // Open 3-Dots Track Action Menu
  const handleOpenTrackMenu = (e, track, extra = {}) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 190;
    const menuHeight = extra?.isQueueItem ? 140 : 180;
    let x = rect.right - menuWidth;
    if (x < 10) x = 10;
    if (x + menuWidth > window.innerWidth - 10) {
      x = window.innerWidth - menuWidth - 10;
    }
    let y = rect.bottom + 6;
    if (y + menuHeight > window.innerHeight - 80) {
      y = rect.top - menuHeight - 6;
    }
    setTrackMenu({ track, x, y, ...extra });
  };

  // Create playlist and add track inside modal
  const handleCreateAndAddInModal = async () => {
    if (!modalNewPlTitle.trim() || !addToPlaylistTrack) return;
    setIsCreatingInModal(true);
    try {
      const newPl = playerStore.createPlaylist(modalNewPlTitle.trim());
      playerStore.addTrackToPlaylist(newPl.id, addToPlaylistTrack);
      showToast(`Created "${newPl.title}" & added track`);
      setModalNewPlTitle('');
      setAddToPlaylistTrack(null);
    } catch (err) {
      console.warn('Create in modal error:', err);
    } finally {
      setIsCreatingInModal(false);
    }
  };

  // Create playlist inside Save Queue Modal
  const handleCreatePlaylistInSaveQueueModal = () => {
    const trimmed = modalNewQueuePlTitle.trim();
    if (!trimmed || isCreatingQueuePl) return;
    setIsCreatingQueuePl(true);
    try {
      const newPl = playerStore.createPlaylist(trimmed);
      if (newPl && newPl.id) {
        setSelectedQueuePlaylistId(newPl.id);
        showToast(`Created playlist "${newPl.title}"`);
        setModalNewQueuePlTitle('');
      }
    } catch (err) {
      console.warn('Create playlist in queue modal error:', err);
    } finally {
      setIsCreatingQueuePl(false);
    }
  };

  // Confirm saving the full queue to the selected playlist with deduplication
  const handleConfirmSaveQueue = async () => {
    if (!selectedQueuePlaylistId || !queue || queue.length === 0 || isSavingQueue) return;
    const targetPl = playlists.find((p) => p.id === selectedQueuePlaylistId);
    if (!targetPl) return;

    setIsSavingQueue(true);
    try {
      // Visual feedback delay so the user experiences the smooth checking/saving spinner
      await new Promise((r) => setTimeout(r, 450));
      const res = playerStore.addTracksToPlaylist(selectedQueuePlaylistId, queue);
      if (res && res.addedCount > 0) {
        showToast(
          `Saved ${res.addedCount} track${res.addedCount > 1 ? 's' : ''} to "${targetPl.title}"${
            res.skippedCount > 0 ? ` (${res.skippedCount} duplicate${res.skippedCount > 1 ? 's' : ''} skipped)` : ''
          }`
        );
      } else if (res && res.skippedCount > 0) {
        showToast(`All ${res.skippedCount} tracks are already in "${targetPl.title}"`);
      } else {
        showToast(`Saved queue to "${targetPl.title}"`);
      }
      setIsSaveQueueModalOpen(false);
      setSelectedQueuePlaylistId(null);
    } catch (err) {
      console.warn('Save queue error:', err);
      showToast('Could not save queue. Please try again.');
    } finally {
      setIsSavingQueue(false);
    }
  };

  // Run Search for a query, record to history, and focus
  const handleRunSearch = (queryText) => {
    const trimmed = (queryText || '').trim();
    if (!trimmed) return;
    setSearchQuery(trimmed);
    playerStore.addSearchHistory(trimmed);
    setIsSearchDropdownOpen(true);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Delete individual entry from search history
  const handleDeleteHistoryItem = (e, itemText) => {
    e.stopPropagation();
    e.preventDefault();
    playerStore.removeSearchHistory(itemText);
  };

  // 2-Step Sign Out Handler (loading with spinner -> success tick SVG -> conclude sign out)
  const handleConfirmSignOut = async () => {
    if (signOutStatus === 'loading') return;
    setSignOutStatus('loading');
    try {
      // Natural loading delay so the user feels the deliberate sign-out process
      await Promise.all([
        authService.signOut(),
        new Promise((resolve) => setTimeout(resolve, 800))
      ]);
      setSignOutStatus('success');
      // Show success tick briefly before concluding
      setTimeout(() => {
        setShowSignOutModal(false);
        setSignOutStatus('idle');
        if (onSignOut) {
          onSignOut();
        }
      }, 900);
    } catch (err) {
      console.warn('Sign out error:', err);
      setSignOutStatus('failed');
    }
  };

  // Live in-playlist YouTube Music Search
  const handlePlaylistLiveSearch = async () => {
    const q = playlistAddSearch.trim();
    if (!q) return;
    setIsPlaylistAddSearching(true);
    try {
      const results = await youtubeMusicService.search(q, 'songs');
      setPlaylistAddResults(results ? results.slice(0, 10) : []);
    } catch (err) {
      console.warn('Playlist live search error:', err);
      showToast('Search failed. Check network connection.');
    } finally {
      setIsPlaylistAddSearching(false);
    }
  };

  // Toggle Like Heart
  const handleToggleLike = (track) => {
    if (!track) return;
    playerStore.toggleLike(track);
  };

  // Shuffle toggle
  const handleToggleShuffle = () => {
    const nextShuffle = !isShuffle;
    setIsShuffle(nextShuffle);
    playerStore.updateSettings({ isShuffle: nextShuffle });
    if (nextShuffle && queue.length > 1) {
      const current = queue[queueIndex];
      const remaining = queue.filter((_, i) => i !== queueIndex);
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
      const shuffled = [current, ...remaining];
      setQueue(shuffled);
      setQueueIndex(0);
      showToast('Queue shuffled');
    }
  };

  // Repeat toggle
  const handleCycleRepeat = () => {
    const modes = ['all', 'one', 'off'];
    const next = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
    setRepeatMode(next);
    playerStore.updateSettings({ repeatMode: next });
    showToast(`Repeat: ${next.toUpperCase()}`);
  };

  // Format Duration seconds to mm:ss
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className={`desktop-main-app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${(!isQueueOpen || !hasPlayedTrack) ? 'queue-closed' : ''} ${!hasPlayedTrack ? 'no-active-player' : ''} ${isFullscreen ? 'fullscreen-active' : ''} ${isFullscreen ? (playerMode === 'video' ? 'fs-video-mode' : 'fs-song-mode') : ''} ${isFullscreen && isSongKaraokeMode ? 'fs-karaoke-active' : ''} ${isFullscreen && !isHudVisible ? 'is-cursor-hidden' : ''}`}
    >
      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="melo-toast-capsule">
          <Heart size={16} fill="#E53935" color="#E53935" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 3-COLUMN DESKTOP ARCHITECTURE */}
      <div className="desktop-app-layout">
        {/* ==================================================================
            1. LEFT NAVIGATION SIDEBAR (Collapsible, Transparent Glass)
            ================================================================== */}
        <aside className="desktop-sidebar">
          {/* Fixed Upper Navigation Section */}
          <div className="sidebar-nav-fixed">
            {/* Top Brand Bar */}
            <div className="sidebar-brand-wrap">
              {!isSidebarCollapsed ? (
                <>
                  <div
                    className="brand-logo-unit"
                    onClick={() => navigateTo('home')}
                    title="MUSE PC Home"
                  >
                    <div className="brand-logo-emblem">
                      <img src={logoBadgeImg} alt="MUSE" className="brand-logo-img" />
                    </div>
                    <div className="brand-logo-text">
                      muse<span className="brand-logo-dot">.</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-sidebar-collapse"
                    onClick={() => setIsSidebarCollapsed(true)}
                    title="Collapse sidebar"
                  >
                    <Menu size={20} />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn-sidebar-collapse"
                  onClick={() => setIsSidebarCollapsed(false)}
                  title="Expand sidebar"
                >
                  <Menu size={20} />
                </button>
              )}
            </div>

            {/* Primary Navigation */}
            <nav className="sidebar-nav-group">
              <button
                type="button"
                className={`sidebar-nav-item ${activeNav === 'home' ? 'active' : ''}`}
                onClick={() => navigateTo('home')}
                title="Home"
              >
                <Home size={19} className="nav-icon" />
                {!isSidebarCollapsed && <span>Home</span>}
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${activeNav === 'youtube' ? 'active' : ''}`}
                onClick={() => navigateTo('youtube')}
                title="YouTube"
              >
                <YoutubeIcon size={19} className="nav-icon" />
                {!isSidebarCollapsed && (
                  <div className="sidebar-nav-label-wrap">
                    <span>YouTube</span>
                    <span className="nav-coming-badge">Coming</span>
                  </div>
                )}
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${activeNav === 'library' || activeNav === 'playlist-detail' ? 'active' : ''}`}
                onClick={() => navigateTo('library')}
                title="Library"
              >
                <Library size={19} className="nav-icon" />
                {!isSidebarCollapsed && <span>Library</span>}
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${activeNav === 'recent' ? 'active' : ''}`}
                onClick={() => navigateTo('recent')}
                title="Recent Activity"
              >
                <History size={19} className="nav-icon" />
                {!isSidebarCollapsed && <span>Recent Activity</span>}
              </button>
            </nav>

            <div className="sidebar-divider" />
          </div>

          {/* Artists Section with Fixed Sticky Header and Scrollable List */}
          <div className="sidebar-artists-section">
            <div className="sidebar-section-header sidebar-artists-fixed-header">
              {!isSidebarCollapsed ? (
                <>
                  <span className="sidebar-section-title">Selected Artists</span>
                  <button
                    type="button"
                    className="btn-edit-artists"
                    onClick={() => setIsArtistModalOpen(true)}
                    title="Update Selected Artists"
                  >
                    <Sliders size={12} />
                    <span>Edit</span>
                  </button>
                </>
              ) : (
                <span className="sidebar-section-title-mini" title="Selected Artists">
                  Artists
                </span>
              )}
            </div>

            <div className="sidebar-artists-scroll">
              <div className="sidebar-artists-list">
                {userArtists.map((artist) => {
                  const isSelected = selectedArtist?.name === artist.name && activeNav === 'artist-profile';
                  return (
                    <div
                      key={artist.id || artist.name}
                      className={`sidebar-artist-item ${isSelected ? 'active' : ''}`}
                      onClick={() => handleOpenArtistProfile(artist)}
                      title={artist.name}
                    >
                      <div className="artist-avatar-wrap">
                        <img
                          src={artist.photo || artist.image || artist.avatar || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80'}
                          alt={artist.name}
                          loading="lazy"
                        />
                      </div>
                      {!isSidebarCollapsed && (
                        <div className="artist-item-info">
                          <span className="artist-item-name">{artist.name}</span>
                          <span className="artist-item-genre">{artist.genre || 'Artist'}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* ==================================================================
            2. CENTER MAIN STAGE (Independent Scroll, Ceramic Glass)
            ================================================================== */}
        <main className="desktop-center-stage">
          {/* Top Bar with History Controls, Search, Equalizer, and User Profile */}
          <header className="desktop-stage-header">
            {/* History Arrows (Spotify-style navigation without stopping music) */}
            <div className="header-nav-arrows">
              <button
                type="button"
                className="btn-nav-arrow"
                onClick={handleNavBack}
                disabled={historyIndex === 0}
                title="Back in history"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="btn-nav-arrow"
                onClick={handleNavForward}
                disabled={historyIndex >= navHistory.length - 1}
                title="Forward in history"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* YouTube Search Bar with Personalized History & Floating Suggestions Dropdown */}
            <div className="header-search-wrap" ref={searchContainerRef}>
              <Search size={18} className="search-bar-icon" />
              <input
                ref={searchInputRef}
                type="text"
                className="header-search-input"
                placeholder="Search songs, albums, artists, music videos, slowed+reverb..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchDropdownOpen(true);
                }}
                onFocus={() => {
                  setIsSearchDropdownOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsSearchDropdownOpen(false);
                  } else if (e.key === 'Enter') {
                    const trimmed = searchQuery.trim();
                    if (trimmed) {
                      playerStore.addSearchHistory(trimmed);
                    }
                  }
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="btn-clear-search"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setSearchSuggestions({ queries: [], items: [] });
                    setIsSearchDropdownOpen(true);
                    if (searchInputRef.current) searchInputRef.current.focus();
                  }}
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              )}

              {/* Floating YouTube Music Search Results & History Card */}
              {isSearchDropdownOpen && (() => {
                const trimmedSearch = searchQuery.trim().toLowerCase();
                const isEmptySearch = !trimmedSearch;

                // 1. EMPTY QUERY STATE: Recent Search History (matching YouTube Music)
                if (isEmptySearch) {
                  return (
                    <div className="yt-search-results-card yt-search-history-card" onClick={(e) => e.stopPropagation()}>
                      <div className="search-card-header search-history-header">
                        <span className="search-results-count">Recent Searches</span>
                        {searchHistory.length > 0 && (
                          <button
                            type="button"
                            className="btn-clear-all-history"
                            onClick={() => playerStore.clearSearchHistory()}
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                      <div className="search-card-body">
                        {searchHistory.length > 0 ? (
                          <div className="search-history-list">
                            {searchHistory.map((item, idx) => (
                              <div
                                key={`hist-${item}-${idx}`}
                                className="search-history-row"
                                onClick={() => handleRunSearch(item)}
                              >
                                <div className="history-icon-col">
                                  <History size={16} className="history-item-icon" />
                                </div>
                                <span className="history-item-text">{item}</span>
                                <button
                                  type="button"
                                  className="btn-delete-history"
                                  onClick={(e) => handleDeleteHistoryItem(e, item)}
                                  title="Delete from history"
                                  aria-label="Delete from history"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="search-card-empty history-empty-view">
                            <History size={26} style={{ opacity: 0.35, marginBottom: 8 }} />
                            <span>Your recent search queries will appear here.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // 2. ACTIVE QUERY STATE: Suggestions, Personalized Favorites & Direct Playable Cards
                const matchedArtist = trimmedSearch.length > 1
                  ? CURATED_ARTISTS.find(
                      (a) =>
                        a.name.toLowerCase() === trimmedSearch ||
                        a.name.toLowerCase().startsWith(trimmedSearch) ||
                        trimmedSearch.startsWith(a.name.toLowerCase())
                    ) ||
                    userArtists.find(
                      (a) =>
                        a.name.toLowerCase() === trimmedSearch ||
                        a.name.toLowerCase().startsWith(trimmedSearch)
                    ) ||
                    searchResults.find(
                      (r) =>
                        r.type === 'Artist' ||
                        (r.artist && r.artist.toLowerCase() === trimmedSearch)
                    )
                  : null;

                // A. Matching History items (at top of query suggestions)
                const matchingHistory = searchHistory.filter(
                  (item) => item.toLowerCase().includes(trimmedSearch)
                ).slice(0, 3);

                // B. YouTube Query Autocomplete Suggestions
                const ytQuerySuggestions = (searchSuggestions?.queries || []).filter((sugg) => {
                  const text = typeof sugg === 'string' ? sugg : sugg.text;
                  return !matchingHistory.some((h) => h.toLowerCase() === text.toLowerCase());
                }).slice(0, 5);

                // C. Direct item cards from YouTube suggestions or full search results
                const rawItems = (searchSuggestions?.items && searchSuggestions.items.length > 0)
                  ? searchSuggestions.items
                  : searchResults;

                const filteredResults = rawItems.filter((track) => {
                  if (searchFilter === 'videos') return track.type === 'Video' || (track.title && track.title.toLowerCase().includes('video'));
                  if (searchFilter === 'songs') return track.type !== 'Video';
                  if (searchFilter === 'artists') return false;
                  return true;
                });

                const seenVidIds = new Set();
                const finalItemResults = [];
                for (const item of filteredResults) {
                  const vid = item.videoId || item.id;
                  if (vid && !seenVidIds.has(vid)) {
                    seenVidIds.add(vid);
                    finalItemResults.push(item);
                  }
                  if (finalItemResults.length >= 10) break;
                }

                const totalResultsCount =
                  (matchedArtist ? 1 : 0) +
                  finalItemResults.length +
                  matchingHistory.length +
                  ytQuerySuggestions.length;

                return (
                  <div className="yt-search-results-card" onClick={(e) => e.stopPropagation()}>
                    <div className="search-card-header">
                      <span className="search-results-count">
                        {isSearching || isSuggestionsLoading
                          ? 'Searching catalog...'
                          : `${totalResultsCount} results`}
                      </span>
                      <div className="search-filter-pills">
                        {['all', 'songs', 'videos', 'artists'].map((flt) => (
                          <button
                            key={flt}
                            type="button"
                            className={`search-pill ${searchFilter === flt ? 'active' : ''}`}
                            onClick={() => setSearchFilter(flt)}
                          >
                            {flt.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="search-card-body">
                      {/* 1. QUERY AUTOCOMPLETE SUGGESTIONS BLOCK */}
                      {(matchingHistory.length > 0 || ytQuerySuggestions.length > 0) && (
                        <div className="search-suggestions-block">
                          {/* Matching Search History Items (Image 1 style with History clock + delete) */}
                          {matchingHistory.map((histText, idx) => (
                            <div
                              key={`match-hist-${histText}-${idx}`}
                              className="search-suggest-row is-history-match"
                              onClick={() => handleRunSearch(histText)}
                            >
                              <div className="suggest-icon-wrap">
                                <History size={15} className="suggest-history-icon" />
                              </div>
                              <div className="suggest-text-wrap">
                                <span className="suggest-text">{histText}</span>
                              </div>
                              <button
                                type="button"
                                className="btn-delete-history"
                                onClick={(e) => handleDeleteHistoryItem(e, histText)}
                                title="Remove from history"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}

                          {/* YouTube Query Autocomplete Suggestions (Image 1 style with Search icon) */}
                          {ytQuerySuggestions.map((sugg, idx) => {
                            const text = typeof sugg === 'string' ? sugg : sugg.text;
                            return (
                              <div
                                key={`yt-sugg-${text}-${idx}`}
                                className="search-suggest-row is-yt-suggest"
                                onClick={() => handleRunSearch(text)}
                              >
                                <div className="suggest-icon-wrap">
                                  <Search size={15} className="suggest-search-icon" />
                                </div>
                                <div className="suggest-text-wrap">
                                  {renderHighlightedQuery(text, trimmedSearch)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Matched Artist Hero Card */}
                      {matchedArtist && (searchFilter === 'all' || searchFilter === 'artists') && (
                        <div
                          className="search-artist-card"
                          onClick={() => {
                            handleOpenArtistProfile(
                              matchedArtist.name
                                ? matchedArtist
                                : { name: matchedArtist.artist || searchQuery, photo: matchedArtist.cover }
                            );
                            setIsSearchDropdownOpen(false);
                          }}
                        >
                          <div className="search-artist-avatar">
                            <img
                              src={
                                matchedArtist.photo ||
                                matchedArtist.image ||
                                matchedArtist.avatar ||
                                matchedArtist.cover ||
                                'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80'
                              }
                              alt={matchedArtist.name || matchedArtist.artist}
                            />
                          </div>
                          <div className="search-artist-info">
                            <div className="search-artist-badge-row">
                              <span className="search-artist-name">{matchedArtist.name || matchedArtist.artist}</span>
                              <span className="artist-badge-verified">
                                <Check size={11} className="check-icon" />
                              </span>
                            </div>
                            <span className="search-artist-sub">Artist • Official Profile</span>
                          </div>
                          <button type="button" className="btn-search-view-artist">
                            View Profile
                          </button>
                        </div>
                      )}

                      {/* Direct Playable Music Cards (Song / Video / Album) */}
                      {isSearching && finalItemResults.length === 0 ? (
                        <div className="search-dropdown-loading">
                          <div className="ceramic-spinner" style={{ width: 22, height: 22, borderWidth: 2.5 }} />
                          <span>Searching catalog...</span>
                        </div>
                      ) : finalItemResults.length > 0 ? (
                        <div className="search-card-list">
                          {finalItemResults.map((track, idx) => {
                            const isTrackLiked = playerStore.isLiked(track.videoId || track.id);
                            const isTrackCurrent = currentTrack?.videoId === track.videoId;
                            return (
                              <div
                                key={`yt-card-${track.videoId || track.id}-${idx}`}
                                className={`search-card-row ${isTrackCurrent ? 'active-track' : ''}`}
                                onClick={() => {
                                  if (track.videoId) {
                                    handlePlayTrack(track, true);
                                    playerStore.addSearchHistory(track.title || searchQuery);
                                    setIsSearchDropdownOpen(false);
                                  } else {
                                    handleRunSearch(track.title);
                                  }
                                }}
                              >
                                <div className="search-row-art">
                                  <img src={track.cover} alt={track.title} />
                                  <div className="search-row-play">
                                    <Play size={14} fill="#FFF" />
                                  </div>
                                </div>
                                <div className="search-row-meta">
                                  <span className="search-row-title">{track.title}</span>
                                  <span className="search-row-sub">
                                    {track.subtitle || `${track.type || 'Song'} • ${track.artist} ${track.views ? `• ${track.views}` : ''}`}
                                  </span>
                                </div>
                                <span className="search-row-type">{track.type || 'Song'}</span>
                                {track.durationFormatted && (
                                  <span className="search-row-dur">{track.durationFormatted}</span>
                                )}
                                <button
                                  type="button"
                                  className="btn-search-row-like"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleLike(track);
                                  }}
                                  title={isTrackLiked ? 'Unlike' : 'Like'}
                                >
                                  <Heart
                                    size={15}
                                    fill={isTrackLiked ? '#E53935' : 'transparent'}
                                    color={isTrackLiked ? '#E53935' : 'var(--text-muted)'}
                                  />
                                </button>
                                <button
                                  type="button"
                                  className="btn-track-menu"
                                  onClick={(e) => handleOpenTrackMenu(e, track)}
                                  title="More options"
                                >
                                  <MoreVertical size={15} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : !matchedArtist && matchingHistory.length === 0 && ytQuerySuggestions.length === 0 ? (
                        <div className="search-card-empty">
                          <span>No results found for "{searchQuery}"</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Header Right Meta & User Avatar */}
            <div className="header-user-meta">
              <button
                type="button"
                className={`header-meta-pill now-playing-pill ${activeNav === 'now-playing' ? 'active-view-pill' : ''}`}
                onClick={() => navigateTo(activeNav === 'now-playing' ? 'home' : 'now-playing')}
                title="Toggle Active Player Stage"
              >
                <Disc size={15} className={isPlaying ? 'spinning-disc-icon' : ''} />
                <span>{activeNav === 'now-playing' ? 'Home' : 'Now Playing'}</span>
              </button>

              <div 
                className={`header-meta-pill status-pill ${isOnline ? 'online' : 'offline'}`} 
                title={isOnline ? "Connected — Online (Hi-Fi Master Stream Active)" : "No Internet Access — Offline (Click to re-test connection)"}
                onClick={() => networkService.verifyConnection()}
                style={{ cursor: 'pointer' }}
              >
                {isOnline ? (
                  <Wifi size={14} className="wifi-icon online" />
                ) : (
                  <WifiOff size={14} className="wifi-icon offline" />
                )}
                <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
              </div>

              {/* User Avatar with Profile Popover */}
              <div className="header-user-wrapper" ref={profileWrapperRef}>
                <div
                  className="header-user-profile"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  title={userProfile?.email || 'User Account'}
                >
                  <div className="user-avatar-badge">
                    {userProfile?.photoURL ? (
                      <img src={userProfile.photoURL} alt={userName} />
                    ) : (
                      <span>{userName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  {updateInfo.hasUpdate && (
                    <span className="profile-update-badge-dot" title={`New update available (v${updateInfo.version})`} />
                  )}
                </div>

                {isProfileMenuOpen && (
                  <div className="header-user-popover" onClick={(e) => e.stopPropagation()}>
                    <div className="popover-user-info">
                      <div className="popover-avatar-circle">
                        {userProfile?.photoURL ? (
                          <img src={userProfile.photoURL} alt={userName} />
                        ) : (
                          userName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="popover-meta">
                        <span className="popover-name">{userName}</span>
                        <span className="popover-email">{userProfile?.email || 'listener@melo.app'}</span>
                      </div>
                    </div>
                    <div className="popover-badge-row">
                      <span className="popover-badge">MUSE Hi-Fi Cloud</span>
                      <span className="popover-version-tag">v{updateInfo.currentVersion || '1.0.4'}</span>
                    </div>
                    <div className="popover-divider" />
                    <div className="popover-actions-list">
                      <button
                        type="button"
                        className="btn-popover-action btn-popover-equalizer"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setIsEqualizerOpen(true);
                        }}
                        title="Acoustic Equalizer & Master Tuner"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Sliders size={15} />
                          <span>Equalizer</span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>EQ</span>
                      </button>

                      <button
                        type="button"
                        className={`btn-popover-action btn-popover-update ${updateInfo.hasUpdate ? 'has-update-pending' : ''}`}
                        onClick={handleTriggerUpdate}
                        disabled={updateInfo.status === 'checking' || updateInfo.status === 'downloading' || updateInfo.status === 'verifying'}
                        title={updateInfo.hasUpdate ? `Update to v${updateInfo.version}` : 'Check for Updates'}
                      >
                        <RefreshCw size={15} className={`update-icon ${updateInfo.status === 'checking' || updateInfo.status === 'downloading' || updateInfo.status === 'verifying' ? 'animate-spin' : ''}`} />
                        <div className="update-btn-label-group">
                          <span>
                            {updateInfo.status === 'checking'
                              ? 'Checking for updates...'
                              : updateInfo.status === 'up-to-date'
                              ? `You're up to date (v${updateInfo.currentVersion || '1.0.4'})`
                              : updateInfo.status === 'downloading'
                              ? `Downloading ${updateInfo.progress}%`
                              : updateInfo.status === 'verifying'
                              ? 'Verifying update...'
                              : updateInfo.status === 'ready'
                              ? `Restart & Install (v${updateInfo.version})`
                              : updateInfo.status === 'error'
                              ? 'Download interrupted • Click to retry'
                              : updateInfo.hasUpdate
                              ? `Update Available (v${updateInfo.version})`
                              : 'Check for Updates'}
                          </span>
                        </div>
                        {updateInfo.hasUpdate && (
                          <span className="green-pulse-indicator" />
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn-popover-action btn-popover-logout"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setShowSignOutModal(true);
                          setSignOutStatus('idle');
                        }}
                        title="Sign Out"
                      >
                        <LogOut size={15} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* ==============================================================
              PAGE 1: HOME PAGE (Real YouTube Music Feeds & Mood Chips)
              ============================================================== */}
          {activeNav === 'home' && (
            <div className="page-view-stage home-page-stage">
              <div className="stage-greeting-row">
                <h1 className="stage-greeting-text">
                  {getGreeting()}, <span className="greeting-username">{userName}</span>
                </h1>
              </div>

              {/* Mood Filter Chips */}
              <div className="category-filter-bar">
                {['All', 'Energize', 'Workout', 'Relax', 'Focus', 'Commute', 'Party'].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={`filter-chip ${activeMood === filter ? 'active' : ''}`}
                    onClick={() => setActiveMood(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Active Mood Section */}
              {activeMood !== 'All' && (
                <section className="feed-section-block">
                  <div className="section-header-row">
                    <div>
                      <h2 className="section-main-heading">{activeMood} Mixes & Soundtracks</h2>
                      <p className="section-caption">Curated for your current state of mind</p>
                    </div>
                  </div>
                  {isMoodLoading ? (
                    <div className="section-loading-box">
                      <div className="ceramic-spinner" />
                    </div>
                  ) : (
                    <div className="quick-picks-grid">
                      {moodTracks.slice(0, 12).map((track) => (
                        <div
                          key={`mood-${track.videoId}`}
                          className={`quick-pick-card ${currentTrack?.videoId === track.videoId ? 'is-active-track' : ''}`}
                          onClick={() => handlePlayTrack(track, true, moodTracks)}
                        >
                          <div className="quick-pick-thumb-wrap">
                            <img src={track.cover} alt={track.title} loading="lazy" />
                            <div className="quick-pick-play-btn">
                              <Play size={12} fill="#111" />
                            </div>
                          </div>
                          <div className="quick-pick-info">
                            <span className="quick-pick-title">{track.title}</span>
                            <span className="quick-pick-artist">{track.artist}</span>
                          </div>
                          <span className="quick-pick-duration">{track.durationFormatted || '3:30'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* SECTION A: Quick Picks from User Taste Profile */}
              {activeMood === 'All' && (
                <>
                  <section className="feed-section-block">
                    <div className="section-header-row" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                      <div>
                        <span className="section-eyebrow">Personalized for You</span>
                        <div className="section-heading-with-spotlight">
                          <h2 className="section-main-heading">Quick Picks</h2>
                          {homeFeed?.isSpotlight && homeFeed?.spotlightArtist && (
                            <span className="spotlight-text-inline">
                              Spotlight on{' '}
                              <button
                                type="button"
                                className="spotlight-artist-link"
                                onClick={() => {
                                  const found = userArtists.find(
                                    (a) => (a.name || a).toLowerCase() === homeFeed.spotlightArtist.toLowerCase()
                                  ) || { name: homeFeed.spotlightArtist, genre: 'Artist' };
                                  handleOpenArtistProfile(found);
                                }}
                                title={`View ${homeFeed.spotlightArtist}'s profile`}
                              >
                                {homeFeed.spotlightArtist}
                              </button>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="carousel-controls">
                        <button
                          type="button"
                          className="btn-carousel-scroll"
                          onClick={() => {
                            const el = document.getElementById('quick-picks-track');
                            if (el) el.scrollBy({ left: -330, behavior: 'smooth' });
                          }}
                          title="Scroll left"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-carousel-scroll"
                          onClick={() => {
                            const el = document.getElementById('quick-picks-track');
                            if (el) el.scrollBy({ left: 330, behavior: 'smooth' });
                          }}
                          title="Scroll right"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                    {isHomeLoading ? (
                      <div className="section-loading-box">
                        <div className="ceramic-spinner" />
                        <span>Curating your personalized quick picks...</span>
                      </div>
                    ) : (
                      <div className="quick-picks-grid" id="quick-picks-track">
                        {homeFeed.quickPicks.map((track) => (
                          <div
                            key={`qp-${track.videoId}`}
                            className={`quick-pick-card ${currentTrack?.videoId === track.videoId ? 'is-active-track' : ''}`}
                            onClick={() => handlePlayTrack(track, true, homeFeed.quickPicks)}
                          >
                            <div className="quick-pick-thumb-wrap">
                              <img src={track.cover} alt={track.title} loading="lazy" />
                              <div className="quick-pick-play-btn">
                                <Play size={12} fill="#111" />
                              </div>
                            </div>
                            <div className="quick-pick-info">
                              <span className="quick-pick-title">{track.title}</span>
                              <span className="quick-pick-artist">{track.artist}</span>
                            </div>
                            <span className="quick-pick-duration">{track.durationFormatted || '3:30'}</span>
                            <button
                              type="button"
                              className="btn-track-menu qp-menu-btn"
                              onClick={(e) => handleOpenTrackMenu(e, track)}
                              title="More options"
                            >
                              <MoreVertical size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* SECTION B: Top Songs & Video Hits from YouTube Music */}
                  <section className="feed-carousel-section">
                    <div className="carousel-section-header">
                      <div>
                        <span className="carousel-eyebrow">From Your Selection</span>
                        <h2 className="carousel-title">Top Songs & Video Hits</h2>
                        {homeFeed?.isFocus && homeFeed?.focusArtist && (
                          <p className="focus-text-sub">
                            Today's focus is{' '}
                            <button
                              type="button"
                              className="focus-artist-link"
                              onClick={() => {
                                const found = userArtists.find(
                                  (a) => (a.name || a).toLowerCase() === homeFeed.focusArtist.toLowerCase()
                                ) || { name: homeFeed.focusArtist, genre: 'Artist' };
                                handleOpenArtistProfile(found);
                              }}
                              title={`View ${homeFeed.focusArtist}'s profile`}
                            >
                              {homeFeed.focusArtist}
                            </button>
                          </p>
                        )}
                      </div>
                      <div className="carousel-controls">
                        <button
                          type="button"
                          className="btn-carousel-scroll"
                          onClick={() => {
                            const el = document.getElementById('top-hits-track');
                            if (el) el.scrollBy({ left: -320, behavior: 'smooth' });
                          }}
                          title="Scroll left"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-carousel-scroll"
                          onClick={() => {
                            const el = document.getElementById('top-hits-track');
                            if (el) el.scrollBy({ left: 320, behavior: 'smooth' });
                          }}
                          title="Scroll right"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="carousel-horizontal-track" id="top-hits-track">
                      {homeFeed.topHits.map((track) => (
                        <div
                          key={`hit-${track.videoId}`}
                          className="video-feed-card"
                          onClick={() => handlePlayTrack(track, true, homeFeed.topHits)}
                        >
                          <div className="card-thumb-wrap">
                            <img src={track.cover} alt={track.title} loading="lazy" />
                            <span className="card-badge-tag">TOP HIT</span>
                            <span className="card-duration-badge">{track.durationFormatted || '3:30'}</span>
                            <div className="card-hover-play">
                              <Play size={18} fill="#111" />
                            </div>
                          </div>
                          <div className="card-info-wrap">
                            <div className="card-info-header">
                              <span className="card-video-title">{track.title}</span>
                              <button
                                type="button"
                                className="btn-track-menu card-top-menu-btn"
                                onClick={(e) => handleOpenTrackMenu(e, track)}
                                title="More options"
                              >
                                <MoreVertical size={14} />
                              </button>
                            </div>
                            <span className="card-artist-name">{track.artist}</span>
                            <span className="card-views-meta">{track.views || 'Official Release'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* SECTION C: Your Musical DNA Selected Artists Carousel */}
                  <section className="feed-carousel-section">
                    <div className="carousel-section-header">
                      <div>
                        <span className="carousel-eyebrow">Your Musical DNA</span>
                        <h2 className="carousel-title">Selected Artists</h2>
                      </div>
                    </div>
                    <div className="artists-circular-shelf">
                      {userArtists.map((artist) => (
                        <div
                          key={`dna-${artist.id || artist.name}`}
                          className="artist-shelf-bubble"
                          onClick={() => handleOpenArtistProfile(artist)}
                        >
                          <div className="shelf-avatar-ring">
                            <img
                              src={artist.photo || artist.image || artist.avatar || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300&q=80'}
                              alt={artist.name}
                              loading="lazy"
                            />
                          </div>
                          <span className="shelf-artist-name">{artist.name}</span>
                          <span className="shelf-artist-tag">{artist.genre || 'Artist'}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* SECTION D: Recommended 16:9 Music Videos */}
                  <section className="feed-carousel-section">
                    <div className="carousel-section-header">
                      <div>
                        <span className="carousel-eyebrow">Listen & Watch</span>
                        <h2 className="carousel-title">Recommended Music Videos</h2>
                      </div>
                      <div className="carousel-controls">
                        <button
                          type="button"
                          className="btn-carousel-scroll"
                          onClick={() => {
                            const el = document.getElementById('rec-videos-track');
                            if (el) el.scrollBy({ left: -320, behavior: 'smooth' });
                          }}
                          title="Scroll left"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-carousel-scroll"
                          onClick={() => {
                            const el = document.getElementById('rec-videos-track');
                            if (el) el.scrollBy({ left: 320, behavior: 'smooth' });
                          }}
                          title="Scroll right"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="carousel-horizontal-track" id="rec-videos-track">
                      {homeFeed.recommendedVideos.map((vid) => (
                        <div
                          key={`rec-vid-${vid.videoId}`}
                          className="video-feed-card"
                          onClick={() => {
                            setPlayerMode('video');
                            playerStore.updateSettings({ playerMode: 'video' });
                            handlePlayTrack(vid, true, homeFeed.recommendedVideos);
                          }}
                        >
                          <div className="card-thumb-wrap">
                            <img src={vid.cover} alt={vid.title} loading="lazy" />
                            <span className="card-badge-tag" style={{ background: '#E53935' }}>OFFICIAL VIDEO</span>
                            <span className="card-duration-badge">{vid.durationFormatted}</span>
                            <div className="card-hover-play">
                              <Play size={18} fill="#111" />
                            </div>
                          </div>
                          <div className="card-info-wrap">
                            <span className="card-video-title">{vid.title}</span>
                            <span className="card-artist-name">{vid.artist}</span>
                            <span className="card-views-meta">{vid.views || 'Official Music Video'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </div>
          )}

          {/* ==============================================================
              PAGE 2: NOW PLAYING FULL THEATER STAGE
              Kept mounted in DOM when a track is active (offscreen when navigating to other tabs)
              so audio playback never stops!
              ============================================================== */}
          <div
            className={`page-view-stage now-playing-stage ${activeNav === 'now-playing' ? 'stage-visible' : 'stage-offscreen'}`}
          >
            {!currentTrack && activeNav === 'now-playing' && (
              <div className="empty-player-card">
                <div className="empty-player-icon-aura">
                  <Disc size={44} />
                </div>
                <h2 className="empty-player-heading">No track currently playing</h2>
                <p className="empty-player-sub">
                  Explore your home feed or pick an artist to begin your listening session.
                </p>
                <button
                  type="button"
                  className="btn-start-listening-pill"
                  onClick={() => {
                    if (homeFeed.quickPicks[0]) handlePlayTrack(homeFeed.quickPicks[0], true);
                    else navigateTo('home');
                  }}
                >
                  Start Listening
                </button>
              </div>
            )}

            <div
              className={`now-playing-full-view ${!currentTrack ? 'now-playing-preloading' : ''}`}
              style={!currentTrack ? { position: 'absolute', opacity: 0.001, pointerEvents: 'none', zIndex: -10 } : undefined}
            >
              {/* Top Song / Video Switcher Pill (Matching index.css and YT Music) */}
              <div className="now-playing-pill-container">
                <div className="song-video-switcher-pill">
                  <button
                    type="button"
                    className={`pill-switch-btn ${playerMode === 'song' ? 'active' : ''}`}
                    onClick={() => handleSwitchPlayerMode('song')}
                  >
                    <Music size={14} />
                    <span>Song</span>
                  </button>
                  <button
                    type="button"
                    className={`pill-switch-btn ${playerMode === 'video' ? 'active' : ''}`}
                    onClick={() => handleSwitchPlayerMode('video')}
                  >
                    <Film size={14} />
                    <span>Video</span>
                  </button>
                </div>
              </div>

              {/* Mode Switching Spinner Card */}
              {isSwitchingMode && (
                <div className="player-mode-switching-overlay">
                  <div className="ceramic-spinner" />
                  <span className="switching-text">
                    {playerMode === 'video' ? 'Loading Video Stream...' : 'Switching to Audio Mode...'}
                  </span>
                </div>
              )}

              {/* FEATURED THEATER SECTION: 16:9 Video or Song Floral Scalloped Artwork */}
              <section className="featured-theater-section">
                <div className={`theater-video-card ${playerMode === 'video' ? 'is-video-mode' : ''}`}>
                  {/* Video Viewport (visible when video mode, offscreen host when song mode so audio continues) */}
                  <div
                    className={`video-viewport ${playerMode === 'video' ? 'viewport-video-visible' : 'viewport-audio-hidden'}`}
                  >
                    <YouTubePlayerHost
                      videoId={currentTrack?.videoId || currentTrack?.youtubeId || (typeof currentTrack?.id === 'string' && currentTrack?.id.startsWith('yt-') ? currentTrack.id.replace('yt-', '') : currentTrack?.id)}
                      isPlaying={isPlaying}
                      volume={volume}
                      isMuted={isMuted}
                      playerMode={playerMode}
                      onReady={(player) => {
                        setYtPlayer(player);
                        if (isRestoredSessionRef.current && currentTrackRef.current?.videoId) {
                          try {
                            const startSec = savedSession?.currentTime || 0;
                            player.cueVideoById({
                              videoId: currentTrackRef.current.videoId,
                              startSeconds: startSec
                            });
                            player.pauseVideo();
                          } catch {}
                          isRestoredSessionRef.current = false;
                        } else if (currentTrackRef.current?.videoId) {
                          try {
                            player.loadVideoById(currentTrackRef.current.videoId, 0);
                            player.playVideo();
                          } catch {}
                        } else {
                          try {
                            player.pauseVideo();
                          } catch {}
                        }
                      }}
                      onStateChange={(state, player) => {
                        const activeYT = player || ytPlayer;
                        if (state === 1) { // PLAYING
                          userRequestedPauseRef.current = false;
                          isTransitioningRef.current = false;
                          setIsPlaying(true);
                        } else if (state === 2) { // PAUSED
                          if (!userRequestedPauseRef.current) {
                            // Prevent spurious pause traps during stream initialization
                            setTimeout(() => {
                              if (!userRequestedPauseRef.current && activeYT && typeof activeYT.playVideo === 'function') {
                                try { activeYT.playVideo(); } catch {}
                              }
                            }, 60);
                            return;
                          }
                          setIsPlaying(false);
                        } else if (state === 5 || state === -1) { // CUED or UNSTARTED
                          if (!userRequestedPauseRef.current && activeYT && typeof activeYT.playVideo === 'function') {
                            try { activeYT.playVideo(); } catch {}
                          }
                        } else if (state === 0) { // ENDED
                          handleNextTrack();
                        }
                      }}
                      onTimeUpdate={(cur, dur) => {
                        if (!isScrubbingRef.current && !isSeekingRef.current) {
                          setCurrentTime(cur);
                          // Periodic session persistence every 2 seconds while playing
                          const now = Date.now();
                          if (now - lastSessionSaveTimeRef.current > 2000) {
                            lastSessionSaveTimeRef.current = now;
                            persistPlaybackSession(cur);
                          }
                        }
                        if (dur > 0 && dur !== duration) setDuration(dur);
                      }}
                      onError={() => {
                        isTransitioningRef.current = false;
                        showToast('Unable to stream this track, playing next...');
                        handleNextTrack();
                      }}
                    />

                    {/* Video Interaction Shield & Custom Non-Clickable Header */}
                    {playerMode === 'video' && currentTrack && (
                      <>
                        {/* Transparent shield covering the iframe so clicks pause/play and YouTube links cannot be clicked */}
                        <div
                          className="video-click-shield video-interaction-shield"
                          onClick={handleTogglePlay}
                          onDoubleClick={handleToggleFullscreen}
                          title="Click to play/pause, double click for full screen"
                        />

                        {/* Custom Header: Non-clickable Song Name & Artist + Fullscreen Toggle */}
                        <div className={`video-custom-overlay-header ${isFullscreen && !isHudVisible ? 'hud-faded' : ''}`}>
                          <div className="video-custom-title-block">
                            <span className="video-custom-title">{currentTrack.title}</span>
                            <span className="video-custom-artist">{currentTrack.artist}</span>
                          </div>
                          <div className="video-custom-actions">
                            <button
                              type="button"
                              className="btn-video-fs-icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFullscreen();
                              }}
                              title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Full Screen (f)'}
                            >
                              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Song Mode: Signature Organic Floral Scalloped Artwork Mask or Full Karaoke Lyric Video */}
                  {playerMode === 'song' && currentTrack && (
                    <div
                      className={`song-stage-viewport ${isSongKaraokeMode ? 'is-karaoke-active' : ''}`}
                      onDoubleClick={handleToggleFullscreen}
                      title="Double-click to toggle full screen"
                    >
                      {/* Top Header with Non-Clickable Song Name + Full Screen Toggle (Cover Mode Fullscreen) */}
                      {!isSongKaraokeMode && (
                        <div className={`song-fs-overlay-header ${isFullscreen && !isHudVisible ? 'hud-faded' : ''}`}>
                          <div className="song-fs-title-block">
                            <span className="song-fs-header-title">{currentTrack.title}</span>
                            <span className="song-fs-header-artist">{currentTrack.artist}</span>
                          </div>
                          <button
                            type="button"
                            className="btn-song-fs-exit"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFullscreen();
                            }}
                            title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Full Screen (f)'}
                          >
                            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                          </button>
                        </div>
                      )}

                      {/* 1. COVER VIEW: Artwork + Metadata + Flowing 3-Line Ticker */}
                      {!isSongKaraokeMode ? (
                        <>
                          <div className="song-scalloped-artwork-wrap">
                            <div className="song-scalloped-aura" />
                            <img
                              src={currentTrack.cover}
                              alt={currentTrack.title}
                              className="song-scalloped-img"
                              style={{ clipPath: 'url(#flower-mask-player)' }}
                            />
                          </div>
                          <div className="song-stage-meta">
                            <h2 className="song-stage-title">{currentTrack.title}</h2>
                            <span className="song-stage-artist">{currentTrack.artist}</span>

                            {/* Live Read-Only Lyrics Ticker in Song Mode */}
                            {lyricsData?.type === 'synced' && lyricsData?.lines?.length > 0 ? (
                              <div className="song-stage-lyric-ticker">
                                {/* Previous line preview (faded above) */}
                                {activeLyricIndex > 0 && lyricsData.lines[activeLyricIndex - 1] ? (
                                  <span
                                    key={`stage-prev-${activeLyricIndex}`}
                                    className="stage-lyric-prev-preview"
                                    title={lyricsData.lines[activeLyricIndex - 1].text}
                                  >
                                    {lyricsData.lines[activeLyricIndex - 1].text}
                                  </span>
                                ) : (
                                  <span className="stage-lyric-prev-preview stage-lyric-spacer" aria-hidden="true">
                                    &nbsp;
                                  </span>
                                )}

                                {/* Active singing line pill (auto-marquee on overflow, refined padding) */}
                                <StageLyricPill
                                  text={
                                    activeLyricIndex >= 0 && lyricsData.lines[activeLyricIndex]
                                      ? lyricsData.lines[activeLyricIndex].text
                                      : '♪ Instrumental ♪'
                                  }
                                  activeLyricIndex={activeLyricIndex}
                                />

                                {/* Next line preview (faded below) */}
                                {lyricsData.lines[activeLyricIndex + 1] ? (
                                  <span
                                    key={`stage-next-${activeLyricIndex}`}
                                    className="stage-lyric-next-preview"
                                    title={lyricsData.lines[activeLyricIndex + 1].text}
                                  >
                                    {lyricsData.lines[activeLyricIndex + 1].text}
                                  </span>
                                ) : (
                                  <span className="stage-lyric-next-preview stage-lyric-spacer" aria-hidden="true">
                                    &nbsp;
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="song-stage-tags">
                                <span className="song-stage-chip">{currentTrack.album || 'Hi-Fi Master'}</span>
                                <span className="song-stage-chip">LOSSLESS AUDIO</span>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        /* 2. KARAOKE VIEW: Flowing Lyric Video Typography */
                        <div className="song-stage-karaoke-wrap">
                          {/* Song Title and Artist (Top Left in Fullscreen, Centered at Top in Card) */}
                          <div className="stage-karaoke-header">
                            <span className="stage-karaoke-track-title">{currentTrack.title}</span>
                            <span className="stage-karaoke-track-artist">{currentTrack.artist}</span>
                          </div>

                          {/* Fullscreen Exit Button in Karaoke Mode */}
                          {isFullscreen && (
                            <button
                              type="button"
                              className="btn-song-fs-exit stage-karaoke-fs-exit"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFullscreen();
                              }}
                              title="Exit Full Screen (Esc)"
                            >
                              <Minimize2 size={18} />
                            </button>
                          )}

                          {/* Flowing Lyrics Stream */}
                          <div
                            className="stage-karaoke-scroller"
                            ref={stageKaraokeContainerRef}
                            onScroll={handleStageKaraokeUserScroll}
                          >
                            {isLyricsLoading ? (
                              <div className="stage-karaoke-loading">
                                <Loader2 size={24} className="spin-animate" />
                                <span>Syncing karaoke lyrics...</span>
                              </div>
                            ) : lyricsData?.type === 'synced' && lyricsData?.lines?.length > 0 ? (
                              <div className="stage-karaoke-lines-list">
                                {lyricsData.lines.map((line, idx) => {
                                  const isActive = activeLyricIndex === idx;
                                  const isPast = activeLyricIndex > idx;
                                  const isFuture = activeLyricIndex < idx;

                                  return (
                                    <p
                                      key={`stage-lrc-${idx}-${line.time}`}
                                      data-index={idx}
                                      className={`stage-karaoke-line ${isActive ? 'active-line' : ''} ${isPast ? 'past-line' : ''} ${isFuture ? 'future-line' : ''}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleLyricLineClick(line.time);
                                      }}
                                    >
                                      {line.text}
                                    </p>
                                  );
                                })}
                              </div>
                            ) : lyricsData?.type === 'plain' && lyricsData?.text ? (
                              <div className="stage-karaoke-plain">
                                <p className="stage-karaoke-plain-text">{lyricsData.text}</p>
                              </div>
                            ) : (
                              <div className="stage-karaoke-empty">
                                <Mic2 size={36} className="karaoke-empty-icon" />
                                <p className="karaoke-empty-title">No synced lyrics available</p>
                                <span className="karaoke-empty-sub">Enjoy the high-fidelity lossless audio stream</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Karaoke / Cover Mode Floating Switcher Button (Bottom-Right of Card) */}
                      {hasLyrics && (
                        <button
                          type="button"
                          className={`stage-mode-toggle-btn ${isSongKaraokeMode ? 'is-cover-toggle' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsSongKaraokeMode(!isSongKaraokeMode);
                          }}
                          title={isSongKaraokeMode ? 'Switch to Album Cover View' : 'Switch to Full Karaoke Lyrics'}
                        >
                          {isSongKaraokeMode ? (
                            <>
                              <Disc size={13} className="toggle-btn-icon" />
                              <span>Cover</span>
                            </>
                          ) : (
                            <>
                              <Mic2 size={13} className="toggle-btn-icon" />
                              <span>Karaoke</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Actions Row Below Player (Channel, Like, Artist Link) */}
              {currentTrack && (
                <div className="now-playing-actions-row">
                  <div className="np-channel-block">
                    <div
                      className="np-channel-avatar"
                      onClick={() => handleOpenArtistProfile({ name: currentTrack.artist })}
                      style={{ cursor: 'pointer' }}
                    >
                      <img src={currentTrack.cover} alt={currentTrack.artist} />
                    </div>
                    <div className="np-channel-details">
                      <span
                        className="np-channel-name"
                        onClick={() => handleOpenArtistProfile({ name: currentTrack.artist })}
                        style={{ cursor: 'pointer' }}
                      >
                        {currentTrack.artist}
                      </span>
                      <span className="np-channel-badge">{currentTrack.album || 'Official Music'}</span>
                    </div>
                  </div>

                  <div className="video-hud-actions">
                    <button
                      type="button"
                      className="btn-player-heart"
                      onClick={() => handleToggleLike(currentTrack)}
                      title={playerStore.isLiked(currentTrack.videoId || currentTrack.id) ? 'Liked' : 'Like'}
                    >
                      <Heart
                        size={22}
                        fill={playerStore.isLiked(currentTrack.videoId || currentTrack.id) ? '#E53935' : 'transparent'}
                        color={playerStore.isLiked(currentTrack.videoId || currentTrack.id) ? '#E53935' : 'var(--text-secondary)'}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ==============================================================
              PAGE 3: ARTIST YOUTUBE PROFILE
              ============================================================== */}
          {activeNav === 'artist-profile' && (
            <div className="page-view-stage artist-profile-stage">
              {isArtistLoading ? (
                <div className="section-loading-box">
                  <div className="ceramic-spinner" />
                  <span>Loading official artist profile...</span>
                </div>
              ) : (
                <div className="artist-profile-content">
                  {/* Hero Banner */}
                  <div className="artist-hero-banner">
                    <div className="artist-banner-art-wrap">
                      <img
                        src={artistProfile?.banner || selectedArtist?.photo || selectedArtist?.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1400&q=85'}
                        alt={artistProfile?.name || selectedArtist?.name}
                        className="artist-banner-photo"
                      />
                      <div className="artist-banner-gradient" />
                    </div>
                    <div className="artist-hero-info">
                      <div className="artist-hero-profile-row">
                        <div className="artist-hero-avatar-wrap">
                          <img
                            src={
                              artistProfile?.photo ||
                              selectedArtist?.photo ||
                              selectedArtist?.image ||
                              selectedArtist?.avatar ||
                              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80'
                            }
                            alt={artistProfile?.name || selectedArtist?.name}
                          />
                        </div>
                        <div className="artist-hero-meta-details">
                          <div className="artist-badge-verified">
                            <Check size={12} className="check-icon" />
                            <span>Verified Artist</span>
                          </div>
                          <h1 className="artist-hero-name">{artistProfile?.name || selectedArtist?.name}</h1>
                          <span className="artist-hero-stats">
                            {artistProfile?.subscribers || '15.8M subscribers'} • {selectedArtist?.genre || 'Official Artist Channel'}
                          </span>
                          <div className="artist-hero-cta-row">
                            <button
                              type="button"
                              className="btn-artist-play"
                              onClick={() => {
                                if (artistProfile?.topSongs?.length > 0) {
                                  handlePlayTrack(artistProfile.topSongs[0], true, artistProfile.topSongs);
                                }
                              }}
                            >
                              <Play size={16} fill="#FFF" />
                              <span>Play All</span>
                            </button>
                            <button
                              type="button"
                              className="btn-artist-shuffle"
                              onClick={() => {
                                if (artistProfile?.topSongs?.length > 0) {
                                  handleToggleShuffle();
                                  handlePlayTrack(artistProfile.topSongs[0], true, artistProfile.topSongs);
                                }
                              }}
                            >
                              <Shuffle size={15} />
                              <span>Shuffle</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Songs Shelf */}
                  <section className="feed-section-block">
                    <h2 className="section-main-heading">Top Songs</h2>
                    <div className="artist-top-songs-table">
                      {artistProfile?.topSongs?.map((track, idx) => (
                        <div
                          key={`art-top-${track.videoId}-${idx}`}
                          className="artist-song-row"
                          onClick={() => handlePlayTrack(track, true, artistProfile.topSongs)}
                        >
                          <span className="song-idx">{idx + 1}</span>
                          <img src={track.cover} alt={track.title} className="song-row-thumb" />
                          <div className="song-row-info">
                            <span className="song-row-title">{track.title}</span>
                            <span className="song-row-album">{track.album}</span>
                          </div>
                          <button
                            type="button"
                            className="btn-row-like"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleLike(track);
                            }}
                          >
                            <Heart
                              size={15}
                              fill={playerStore.isLiked(track.videoId || track.id) ? '#E53935' : 'transparent'}
                              color={playerStore.isLiked(track.videoId || track.id) ? '#E53935' : 'var(--text-muted)'}
                            />
                          </button>
                          <button
                            type="button"
                            className="btn-track-menu"
                            onClick={(e) => handleOpenTrackMenu(e, track)}
                            title="More options"
                          >
                            <MoreVertical size={14} />
                          </button>
                          <span className="song-row-dur">{track.durationFormatted}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Albums Carousel */}
                  {artistProfile?.albums?.length > 0 && (
                    <section className="feed-section-block">
                      <h2 className="section-main-heading">Albums</h2>
                      <div className="cards-horizontal-shelf">
                        {artistProfile.albums.map((alb) => (
                          <div
                            key={alb.id}
                            className="horizontal-music-card clickable-album-card"
                            onClick={() => handleOpenAlbum(alb, artistProfile.name)}
                            title={`Open ${alb.title}`}
                          >
                            <div className="card-square-art">
                              <img src={alb.cover} alt={alb.title} loading="lazy" />
                              <div className="card-hover-play">
                                <Play size={18} fill="#111" />
                              </div>
                            </div>
                            <span className="card-track-title">{alb.title}</span>
                            <span className="card-track-subtitle">{alb.year}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Singles & EPs Carousel */}
                  {artistProfile?.singles?.length > 0 && (
                    <section className="feed-section-block">
                      <h2 className="section-main-heading">Singles & EPs</h2>
                      <div className="cards-horizontal-shelf">
                        {artistProfile.singles.map((sgl) => (
                          <div
                            key={sgl.id}
                            className="horizontal-music-card clickable-album-card"
                            onClick={() => handleOpenAlbum(sgl, artistProfile.name)}
                            title={`Open ${sgl.title}`}
                          >
                            <div className="card-square-art">
                              <img src={sgl.cover} alt={sgl.title} loading="lazy" />
                              <div className="card-hover-play">
                                <Play size={18} fill="#111" />
                              </div>
                            </div>
                            <span className="card-track-title">{sgl.title}</span>
                            <span className="card-track-subtitle">{sgl.year}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Music Videos Carousel */}
                  {artistProfile?.videos?.length > 0 && (
                    <section className="feed-section-block">
                      <h2 className="section-main-heading">Music Videos</h2>
                      <div className="cards-horizontal-shelf">
                        {artistProfile.videos.map((vid) => (
                          <div
                            key={vid.id}
                            className="horizontal-music-card video-card-wide"
                            onClick={() => {
                              setPlayerMode('video');
                              playerStore.updateSettings({ playerMode: 'video' });
                              handlePlayTrack(vid, true);
                            }}
                          >
                            <div className="card-video-art">
                              <img src={vid.cover} alt={vid.title} loading="lazy" />
                            </div>
                            <span className="card-track-title">{vid.title}</span>
                            <span className="card-track-subtitle">{vid.views}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==============================================================
              PAGE 4: LIBRARY & PLAYLISTS
              ============================================================== */}
          {activeNav === 'library' && (
            <div className="page-view-stage library-page-stage">
              <div className="library-header-row">
                <h1 className="page-main-heading">Library</h1>
                <button
                  type="button"
                  className="btn-new-playlist-top"
                  onClick={() => setIsNewPlaylistModalOpen(true)}
                >
                  <Plus size={16} />
                  <span>New Playlist</span>
                </button>
              </div>

              {/* Sub-Filters */}
              <div className="category-filter-bar">
                {['All', 'Playlists', 'Songs'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`filter-chip ${libraryFilter === tab ? 'active' : ''}`}
                    onClick={() => setLibraryFilter(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Playlists & Liked Music Grid (YouTube Music Layout) */}
              <div className="library-cards-grid">
                {/* Official Liked Music Auto-Folder Card */}
                {(libraryFilter === 'All' || libraryFilter === 'Playlists' || libraryFilter === 'Songs') && (
                  <div
                    className="library-item-card liked-folder-card"
                    onClick={() => {
                      handleOpenPlaylist({
                        id: 'liked-folder',
                        title: 'Liked Music',
                        description: 'Auto playlist • All tracks you have liked on Melo',
                        cover: likedSongs[0]?.cover || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80',
                        tracks: likedSongs,
                        isLikedFolder: true
                      });
                    }}
                  >
                    <div className="library-card-art liked-folder-art">
                      <Heart size={44} fill="#FFFFFF" color="#FFFFFF" />
                      <div className="card-hover-play">
                        <Play size={20} fill="#111" />
                      </div>
                    </div>
                    <h4 className="library-card-name">Liked Music</h4>
                    <span className="library-card-count">Auto playlist • {likedSongs.length} tracks</span>
                  </div>
                )}

                {/* Custom User Playlists */}
                {(libraryFilter === 'All' || libraryFilter === 'Playlists') &&
                  playlists.map((pl) => (
                    <div
                      key={pl.id}
                      className="library-item-card"
                      onClick={() => handleOpenPlaylist(pl)}
                    >
                      <div className="library-card-art">
                        <PlaylistCoverArt playlist={pl} />
                        <div className="card-hover-play">
                          <Play size={20} fill="#111" />
                        </div>
                      </div>
                      <h4 className="library-card-name">{pl.title}</h4>
                      <span className="library-card-count">{pl.tracks?.length || 0} tracks</span>
                      <p className="library-card-desc">{pl.description}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ==============================================================
              PAGE 5: PLAYLIST DETAIL VIEW
              ============================================================== */}
          {activeNav === 'playlist-detail' && selectedPlaylist && (
            /* UNIFIED PLAYLIST & LIKED MUSIC DETAIL VIEW (CERAMIC AESTHETIC) */
            <div className="page-view-stage custom-playlist-stage">
              {/* COMPACT CERAMIC HERO CARD */}
              <div className="custom-pl-hero-card">
                <div className="custom-pl-cover-wrapper">
                  {selectedPlaylist.isLikedFolder ? (
                    <div className="liked-folder-art" style={{ width: '100%', height: '100%' }}>
                      <Heart size={52} fill="#FFF" color="#FFF" />
                    </div>
                  ) : (
                    <PlaylistCoverArt playlist={selectedPlaylist} />
                  )}
                  {selectedPlaylist.tracks?.length > 0 && (
                    <button
                      type="button"
                      className="custom-pl-cover-play"
                      onClick={() => handlePlayTrack(selectedPlaylist.tracks[0], true, selectedPlaylist.tracks)}
                      title="Play all tracks"
                    >
                      <Play size={22} fill="#111" />
                    </button>
                  )}
                </div>

                <div className="custom-pl-info-block">
                  <div className="custom-pl-tag-row">
                    <span className={`custom-pl-pill ${selectedPlaylist.isLikedFolder ? 'is-liked-pill' : ''}`}>
                      {selectedPlaylist.isLikedFolder ? (
                        <>
                          <Heart size={12} fill="#FFF" color="#FFF" /> Liked Music
                        </>
                      ) : (
                        <>
                          <Disc size={13} /> Playlist
                        </>
                      )}
                    </span>
                    <span className="custom-pl-dot">•</span>
                    <span className="custom-pl-meta-pill">
                      {selectedPlaylist.tracks?.length || 0} tracks
                    </span>
                    <span className="custom-pl-dot">•</span>
                    <span className="custom-pl-meta-pill">
                      <Clock size={12} /> {formatPlaylistDuration(selectedPlaylist.tracks)}
                    </span>
                    <span className="custom-pl-dot">•</span>
                    <span className="custom-pl-curator">
                      {selectedPlaylist.isLikedFolder ? (
                        <>Personal Collection</>
                      ) : (
                        <>Curated by <strong>{userName}</strong></>
                      )}
                    </span>
                  </div>

                  <h1 className="custom-pl-title">{selectedPlaylist.title}</h1>

                  <p className="custom-pl-desc">
                    {selectedPlaylist.description || (selectedPlaylist.isLikedFolder ? 'Auto playlist • All songs and tracks you have loved on Melo.' : '')}
                  </p>

                  <div className="custom-pl-actions-bar">
                    <button
                      type="button"
                      className="btn-cpl-primary"
                      disabled={!selectedPlaylist.tracks || selectedPlaylist.tracks.length === 0}
                      onClick={() => {
                        if (selectedPlaylist.tracks?.length > 0) {
                          handlePlayTrack(selectedPlaylist.tracks[0], true, selectedPlaylist.tracks);
                        }
                      }}
                    >
                      <Play size={16} fill="#FFF" />
                      <span>Play All</span>
                    </button>

                    <button
                      type="button"
                      className="btn-cpl-secondary"
                      disabled={!selectedPlaylist.tracks || selectedPlaylist.tracks.length === 0}
                      onClick={() => {
                        if (selectedPlaylist.tracks?.length > 0) {
                          handleToggleShuffle();
                          handlePlayTrack(selectedPlaylist.tracks[0], true, selectedPlaylist.tracks);
                        }
                      }}
                    >
                      <Shuffle size={15} />
                      <span>Shuffle</span>
                    </button>

                    {!selectedPlaylist.isLikedFolder && (
                      <button
                        type="button"
                        className="btn-cpl-delete"
                        onClick={() => handleDeletePlaylist(selectedPlaylist)}
                        title="Delete this playlist"
                      >
                        <Trash2 size={15} />
                        <span>Delete</span>
                      </button>
                    )}

                    {selectedPlaylist.tracks?.length > 0 && (
                      <div className="custom-pl-search-wrap">
                        <Search size={14} className="custom-pl-search-icon" />
                        <input
                          type="text"
                          placeholder={selectedPlaylist.isLikedFolder ? "Filter liked songs..." : "Filter songs in playlist..."}
                          value={playlistTrackSearch}
                          onChange={(e) => setPlaylistTrackSearch(e.target.value)}
                          className="custom-pl-search-input"
                        />
                        {playlistTrackSearch && (
                          <button
                            type="button"
                            className="custom-pl-clear-search"
                            onClick={() => setPlaylistTrackSearch('')}
                            title="Clear filter"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

                {/* TRACKLIST OR CREATIVE EMPTY CURATION STUDIO */}
                {(() => {
                  const allTracks = selectedPlaylist.tracks || [];
                  const filtered = playlistTrackSearch.trim()
                    ? allTracks.filter((t) =>
                        (t.title && t.title.toLowerCase().includes(playlistTrackSearch.toLowerCase())) ||
                        (t.artist && t.artist.toLowerCase().includes(playlistTrackSearch.toLowerCase()))
                      )
                    : allTracks;

                  const suggestedTracks = (
                    homeFeed.quickPicks?.length > 0
                      ? homeFeed.quickPicks
                      : homeFeed.topHits?.length > 0
                        ? homeFeed.topHits
                        : []
                  ).slice(0, 6);

                  if (allTracks.length === 0) {
                    return (
                      <div className="custom-pl-empty-curation">
                        <div className="custom-pl-empty-banner">
                          <div
                            className="custom-pl-empty-badge"
                            style={
                              selectedPlaylist.isLikedFolder
                                ? { background: 'rgba(229, 57, 53, 0.12)', color: '#E53935' }
                                : undefined
                            }
                          >
                            {selectedPlaylist.isLikedFolder ? <Heart size={26} fill="#E53935" /> : <Music size={26} />}
                          </div>
                          <div className="custom-pl-empty-body">
                            <h3 className="custom-pl-empty-title">
                              {selectedPlaylist.isLikedFolder ? 'Your Liked Music is waiting for sound' : 'This mixtape is ready for sound'}
                            </h3>
                            <p className="custom-pl-empty-subtitle">
                              {selectedPlaylist.isLikedFolder
                                ? 'Save songs by tapping the heart icon on any track while exploring or listening to build your favorites.'
                                : 'Add tracks from recommendations below, or explore the Melo library to curate your vibe.'}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="btn-cpl-explore"
                            style={{ background: '#111111', color: '#FFFFFF' }}
                            onClick={() => navigateTo('home')}
                          >
                            <Compass size={16} />
                            <span style={{ color: '#FFFFFF', fontWeight: 700 }}>Explore Music</span>
                          </button>
                        </div>

                        {suggestedTracks.length > 0 && (
                          <div className="custom-pl-quick-add-card">
                            <div className="custom-pl-quick-add-header">
                              <div className="quick-add-title-cluster">
                                <Sparkles size={16} className="sparkle-gold" />
                                <h4>{selectedPlaylist.isLikedFolder ? 'Quick Add Recommendations' : 'Instant Add Recommendations'}</h4>
                              </div>
                              <span className="quick-add-tip">
                                {selectedPlaylist.isLikedFolder ? '1-click save to your favorites' : '1-click curate into this playlist'}
                              </span>
                            </div>
                            <div className="custom-pl-quick-add-grid">
                              {suggestedTracks.map((sTrack, sIdx) => {
                                const isAlreadyIn = (selectedPlaylist.tracks || []).some(
                                  (t) => (t.videoId && t.videoId === sTrack.videoId) || (t.id && t.id === sTrack.id)
                                );
                                return (
                                  <div key={`sug-${sTrack.videoId || sTrack.id}-${sIdx}`} className="custom-pl-sug-item">
                                    <div
                                      className="custom-pl-sug-thumb-wrap"
                                      onClick={() => handlePlayTrack(sTrack, true)}
                                      title="Preview song"
                                    >
                                      <img src={sTrack.cover} alt={sTrack.title} className="custom-pl-sug-thumb" />
                                      <div className="custom-pl-sug-play-overlay">
                                        <Play size={13} fill="#FFF" />
                                      </div>
                                    </div>
                                    <div className="custom-pl-sug-info">
                                      <span className="custom-pl-sug-title" title={sTrack.title}>{sTrack.title}</span>
                                      <span className="custom-pl-sug-artist" title={sTrack.artist}>{sTrack.artist}</span>
                                    </div>
                                    <button
                                      type="button"
                                      className={`btn-cpl-sug-add ${isAlreadyIn ? 'is-added' : ''}`}
                                      disabled={isAlreadyIn}
                                      onClick={() => {
                                        if (selectedPlaylist.isLikedFolder) {
                                          playerStore.toggleLike(sTrack);
                                          showToast(`Saved "${sTrack.title}" to Liked Music`);
                                        } else {
                                          playerStore.addTrackToPlaylist(selectedPlaylist.id, sTrack);
                                          showToast(`Added "${sTrack.title}" to ${selectedPlaylist.title}`);
                                        }
                                      }}
                                      title={isAlreadyIn ? 'Already saved' : (selectedPlaylist.isLikedFolder ? 'Save to Liked' : 'Add to playlist')}
                                    >
                                      {isAlreadyIn ? <Check size={13} /> : <Plus size={13} />}
                                      <span>{isAlreadyIn ? (selectedPlaylist.isLikedFolder ? 'Saved' : 'Added') : (selectedPlaylist.isLikedFolder ? 'Like' : 'Add')}</span>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (filtered.length === 0) {
                    return (
                      <div className="custom-pl-search-no-match">
                        <p>No tracks matching "{playlistTrackSearch}" in {selectedPlaylist.isLikedFolder ? 'your Liked Music' : 'this playlist'}.</p>
                        <button
                          type="button"
                          className="btn-cpl-clear-filter"
                          onClick={() => setPlaylistTrackSearch('')}
                        >
                          Clear Filter
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="custom-pl-table-card">
                      <div className="custom-pl-table-header">
                        <span className="cpl-col-idx">#</span>
                        <span className="cpl-col-title">TITLE</span>
                        <span className="cpl-col-artist">ARTIST</span>
                        <span className="cpl-col-time">TIME</span>
                        <span className="cpl-col-actions">ACTIONS</span>
                      </div>
                      <div className="custom-pl-track-list">
                        {filtered.map((track, idx) => {
                          const isTrackActive =
                            (currentTrack?.videoId && currentTrack?.videoId === track.videoId) ||
                            (currentTrack?.id && currentTrack?.id === track.id);
                          const isCurrentlyPlaying = isTrackActive && isPlaying;

                          return (
                            <div
                              key={`cpl-track-${track.videoId || track.id}-${idx}`}
                              className={`custom-pl-track-row ${isTrackActive ? 'is-active-row' : ''}`}
                              onClick={() => handlePlayTrack(track, true, filtered)}
                            >
                              <span className="cpl-col-idx">
                                {isCurrentlyPlaying ? (
                                  <div className="playing-eq-bars">
                                    <span className="eq-bar bar-1" />
                                    <span className="eq-bar bar-2" />
                                    <span className="eq-bar bar-3" />
                                  </div>
                                ) : (
                                  <span className="cpl-idx-num">{idx + 1}</span>
                                )}
                              </span>
                              <div className="cpl-col-title cpl-title-cell">
                                <img src={track.cover} alt={track.title} className="cpl-track-thumb" />
                                <div className="cpl-track-meta">
                                  <span className={`cpl-track-title ${isTrackActive ? 'active-title' : ''}`}>
                                    {track.title}
                                  </span>
                                  <span className="cpl-track-artist-sub">{track.artist}</span>
                                </div>
                              </div>
                              <div
                                className="cpl-col-artist cpl-artist-cell"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (track.artist) handleOpenArtistProfile({ name: track.artist });
                                }}
                                title={`View artist: ${track.artist}`}
                              >
                                <span>{track.artist}</span>
                              </div>
                              <span className="cpl-col-time cpl-duration-text">
                                {track.durationFormatted || '3:30'}
                              </span>
                              <div className="cpl-col-actions" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  className="btn-cpl-row-action"
                                  onClick={() => handleToggleLike(track)}
                                  title={playerStore.isLiked(track.videoId || track.id) ? 'Unlike' : 'Like'}
                                >
                                  <Heart
                                    size={15}
                                    fill={playerStore.isLiked(track.videoId || track.id) ? '#E53935' : 'transparent'}
                                    color={playerStore.isLiked(track.videoId || track.id) ? '#E53935' : 'var(--text-muted)'}
                                  />
                                </button>
                                <button
                                  type="button"
                                  className="btn-cpl-row-action"
                                  onClick={(e) => handleOpenTrackMenu(e, track)}
                                  title="More options"
                                >
                                  <MoreVertical size={14} />
                                </button>
                                {!selectedPlaylist.isLikedFolder && (
                                  <button
                                    type="button"
                                    className="btn-cpl-row-action btn-cpl-remove"
                                    title="Remove from playlist"
                                    onClick={() => handleRemoveTrackFromPlaylist(track)}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* FIND MORE SONGS FOR THIS PLAYLIST (LIVE YOUTUBE MUSIC SEARCH) */}
                <div className="custom-pl-live-search-section">
                  <div className="pl-search-add-header">
                    <div className="pl-search-add-title-cluster">
                      <Search size={16} className="pl-search-add-icon" />
                      <h3>{selectedPlaylist.isLikedFolder ? 'Discover more songs to save' : 'Find more songs for this playlist'}</h3>
                    </div>
                    <span className="pl-search-add-sub">
                      {selectedPlaylist.isLikedFolder
                        ? 'Search catalog to directly add tracks to your Liked Music'
                        : 'Search catalog to add tracks directly'}
                    </span>
                  </div>

                  <div className="pl-search-add-input-bar">
                    <Search size={15} className="pl-input-search-icon" />
                    <input
                      type="text"
                      placeholder="Search songs or artists to add..."
                      value={playlistAddSearch}
                      onChange={(e) => setPlaylistAddSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handlePlaylistLiveSearch();
                      }}
                      className="pl-search-add-input"
                    />
                    {playlistAddSearch && (
                      <button
                        type="button"
                        className="pl-clear-search-btn"
                        onClick={() => {
                          setPlaylistAddSearch('');
                          setPlaylistAddResults([]);
                        }}
                        title="Clear search"
                      >
                        <X size={13} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-pl-search-submit"
                      disabled={!playlistAddSearch.trim() || isPlaylistAddSearching}
                      onClick={handlePlaylistLiveSearch}
                    >
                      {isPlaylistAddSearching ? <Loader2 size={13} className="spin-animate" /> : 'Search'}
                    </button>
                  </div>

                  {/* Live Search Results */}
                  {isPlaylistAddSearching ? (
                    <div className="pl-search-loading">
                      <div className="ceramic-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                      <span>Searching catalog...</span>
                    </div>
                  ) : playlistAddResults.length > 0 ? (
                    <div className="pl-search-results-list">
                      {playlistAddResults.map((sTrack, sIdx) => {
                        const isAlreadyIn = (selectedPlaylist.tracks || []).some(
                          (t) => (t.videoId && t.videoId === sTrack.videoId) || (t.id && t.id === sTrack.id)
                        );
                        return (
                          <div key={`pl-sr-${sTrack.videoId || sTrack.id}-${sIdx}`} className="pl-search-result-row">
                            <div
                              className="pl-sr-thumb-wrap"
                              onClick={() => handlePlayTrack(sTrack, true)}
                              title="Preview track"
                            >
                              <img src={sTrack.cover} alt={sTrack.title} className="pl-sr-thumb" />
                              <div className="pl-sr-play-overlay">
                                <Play size={13} fill="#FFF" />
                              </div>
                            </div>
                            <div className="pl-sr-info">
                              <span className="pl-sr-title" title={sTrack.title}>{sTrack.title}</span>
                              <span className="pl-sr-artist" title={sTrack.artist}>{sTrack.artist}</span>
                            </div>
                            <span className="pl-sr-dur">{sTrack.durationFormatted || '3:30'}</span>
                            <button
                              type="button"
                              className={`btn-pl-sr-add ${isAlreadyIn ? 'is-added' : ''}`}
                              disabled={isAlreadyIn}
                              onClick={() => {
                                if (selectedPlaylist.isLikedFolder) {
                                  playerStore.toggleLike(sTrack);
                                  showToast(`Saved "${sTrack.title}" to Liked Music`);
                                } else {
                                  playerStore.addTrackToPlaylist(selectedPlaylist.id, sTrack);
                                  showToast(`Added "${sTrack.title}" to ${selectedPlaylist.title}`);
                                }
                              }}
                            >
                              {isAlreadyIn ? <Check size={13} /> : <Plus size={13} />}
                              <span>{isAlreadyIn ? (selectedPlaylist.isLikedFolder ? 'Saved' : 'Added') : (selectedPlaylist.isLikedFolder ? 'Like' : 'Add')}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            )}

          {/* ==============================================================
              PAGE: ALBUM DETAIL VIEW (Cover, Metadata, Play All, Tracklist)
              ============================================================== */}
          {activeNav === 'album-detail' && selectedAlbum && (
            <div className="page-view-stage album-detail-stage">
              <div className="playlist-detail-hero">
                <div className="playlist-hero-cover album-hero-cover-wrap">
                  <img
                    src={albumDetails?.cover || selectedAlbum.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80'}
                    alt={albumDetails?.title || selectedAlbum.title}
                  />
                </div>
                <div className="playlist-hero-info">
                  <span className="playlist-hero-tag">Album</span>
                  <h1 className="playlist-hero-title">{albumDetails?.title || selectedAlbum.title}</h1>
                  <p
                    className="playlist-hero-desc album-artist-link"
                    onClick={() => {
                      const artistName = albumDetails?.artist || selectedAlbum.artist;
                      if (artistName) handleOpenArtistProfile({ name: artistName });
                    }}
                    title={`View artist profile: ${albumDetails?.artist || selectedAlbum.artist}`}
                  >
                    {albumDetails?.artist || selectedAlbum.artist}
                  </p>
                  <span className="playlist-hero-meta">
                    {albumDetails?.tracks ? `${albumDetails.tracks.length} tracks` : 'Fetching tracklist...'} • {albumDetails?.subtitle || selectedAlbum.year || 'Official Album'}
                  </span>
                </div>
              </div>

              <div className="playlist-action-bar">
                <button
                  type="button"
                  className="btn-playlist-play-all"
                  disabled={isAlbumLoading || !albumDetails?.tracks || albumDetails.tracks.length === 0}
                  onClick={() => {
                    if (albumDetails?.tracks?.length > 0) {
                      handlePlayTrack(albumDetails.tracks[0], true, albumDetails.tracks);
                    }
                  }}
                >
                  <Play size={18} fill="#FFF" />
                  <span>Play All</span>
                </button>
                <button
                  type="button"
                  className="btn-playlist-shuffle"
                  disabled={isAlbumLoading || !albumDetails?.tracks || albumDetails.tracks.length === 0}
                  onClick={() => {
                    if (albumDetails?.tracks?.length > 0) {
                      const current = albumDetails.tracks[0];
                      const remaining = albumDetails.tracks.slice(1);
                      for (let i = remaining.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
                      }
                      const shuffled = [current, ...remaining];
                      handlePlayTrack(shuffled[0], true, shuffled);
                    }
                  }}
                >
                  <Shuffle size={16} />
                  <span>Shuffle</span>
                </button>
              </div>

              {isAlbumLoading ? (
                <div className="section-loading-box">
                  <div className="ceramic-spinner" />
                  <span>Loading full album tracklist...</span>
                </div>
              ) : albumDetails?.tracks?.length > 0 ? (
                <div className="artist-top-songs-table">
                  {albumDetails.tracks.map((track, idx) => (
                    <div
                      key={`alb-track-${track.videoId}-${idx}`}
                      className="artist-song-row"
                      onClick={() => handlePlayTrack(track, true, albumDetails.tracks)}
                    >
                      <span className="song-idx">{idx + 1}</span>
                      <img src={track.cover || albumDetails.cover || selectedAlbum.cover} alt={track.title} className="song-row-thumb" />
                      <div className="song-row-info">
                        <span className="song-row-title">{track.title}</span>
                        <span className="song-row-album">{track.artist}</span>
                      </div>
                      <button
                        type="button"
                        className="btn-row-like"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleLike(track);
                        }}
                      >
                        <Heart
                          size={15}
                          fill={playerStore.isLiked(track.videoId || track.id) ? '#E53935' : 'transparent'}
                          color={playerStore.isLiked(track.videoId || track.id) ? '#E53935' : 'var(--text-muted)'}
                        />
                      </button>
                      <button
                        type="button"
                        className="btn-track-menu"
                        onClick={(e) => handleOpenTrackMenu(e, track)}
                        title="More options"
                      >
                        <MoreVertical size={14} />
                      </button>
                      <span className="song-row-dur">{track.durationFormatted}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="search-empty-box">
                  <p>Unable to load tracks for this album. Please try another album or search directly.</p>
                </div>
              )}
            </div>
          )}

          {/* ==============================================================
              PAGE 6: RECENT ACTIVITY
              ============================================================== */}
          {activeNav === 'recent' && (
            <div className="page-view-stage recent-page-stage">
              <div className="page-header-row">
                <div>
                  <h1 className="page-main-heading">Recent Activity</h1>
                  <p className="page-subheading">Tracks and videos you've listened to recently on MUSE PC</p>
                </div>
                {recentActivity.length > 0 && (
                  <div className="recent-clear-action-group">
                    {showClearHistoryConfirm ? (
                      <div className="clear-confirm-bubble">
                        <span className="clear-confirm-text">Clear listening history?</span>
                        <button
                          type="button"
                          className="btn-confirm-clear"
                          onClick={() => {
                            playerStore.clearRecentActivity();
                            setShowClearHistoryConfirm(false);
                            showToast('Recent listening history cleared');
                          }}
                        >
                          Yes, Clear
                        </button>
                        <button
                          type="button"
                          className="btn-cancel-clear"
                          onClick={() => setShowClearHistoryConfirm(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn-clear-history"
                        onClick={() => setShowClearHistoryConfirm(true)}
                        title="Clear recent listening history"
                      >
                        <Trash2 size={15} />
                        <span>Clear History</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {recentActivity.length > 0 ? (
                <div className="recent-tracks-table">
                  <div className="recent-table-head">
                    <span className="col-idx">#</span>
                    <span>Title</span>
                    <span>Artist</span>
                    <span>Album</span>
                    <span>Duration</span>
                    <span style={{ textAlign: 'right', paddingRight: 8 }}>Actions</span>
                  </div>
                  <div className="recent-table-body">
                    {recentActivity.map((track, idx) => {
                      const isTrackLiked = playerStore.isLiked(track.videoId || track.id);
                      return (
                        <div
                          key={`rec-${track.videoId}-${idx}`}
                          className="recent-table-row"
                          onClick={() => handlePlayTrack(track, true, recentActivity)}
                        >
                          <div className="col-idx">
                            <span className="idx-number">{idx + 1}</span>
                            <div className="row-play-icon">
                              <Play size={12} fill="#111" />
                            </div>
                          </div>
                          <div className="col-title">
                            <div className="recent-row-thumb">
                              <img src={track.cover} alt={track.title} />
                            </div>
                            <div className="recent-row-names">
                              <span className="track-title-text">{track.title}</span>
                              <span className="track-artist-text">{track.artist}</span>
                            </div>
                          </div>
                          <span className="col-album">{track.artist}</span>
                          <span className="col-album">{track.album || 'Official Music'}</span>
                          <span className="col-duration">{track.durationFormatted || '3:30'}</span>
                          <div className="recent-row-actions">
                            <button
                              type="button"
                              className="btn-row-heart"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleLike(track);
                              }}
                              title={isTrackLiked ? 'Unlike' : 'Like'}
                            >
                              <Heart
                                size={15}
                                fill={isTrackLiked ? '#E53935' : 'transparent'}
                                color={isTrackLiked ? '#E53935' : 'var(--text-muted)'}
                              />
                            </button>
                            <button
                              type="button"
                              className="btn-track-menu"
                              onClick={(e) => handleOpenTrackMenu(e, track)}
                              title="More options"
                            >
                              <MoreVertical size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="search-empty-box">
                  <p>No recent activity yet. Songs you listen to will automatically be recorded here.</p>
                </div>
              )}
            </div>
          )}

          {/* ==============================================================
              PAGE 7: YOUTUBE EXPLORER (Coming Soon)
              ============================================================== */}
          {activeNav === 'youtube' && (
            <div className="page-view-stage youtube-coming-stage">
              <div className="yt-coming-card">
                <YoutubeIcon size={64} className="yt-coming-emblem" />
                <h1 className="yt-coming-heading">YouTube on MUSE</h1>
                <p className="yt-coming-sub">
                  Experience seamless, ad-free video exploration and your subscribed channels right within MUSE Desktop.
                </p>
                <div className="yt-coming-badge-row">
                  <span className="nav-coming-badge">COMING SOON</span>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ==================================================================
            3. RIGHT DOCK ("Queue & Sidecar" - Up Next, Lyrics, Related)
            ================================================================== */}
        {hasPlayedTrack && (
          <aside className="desktop-right-dock" ref={rightDockRef}>
            <div className="dock-top-header">
              <div className="dock-title-group">
                <div className="dock-heading-wrap">
                  <h3 className="dock-heading">
                    {dockTab === 'lyrics' ? 'Live Lyrics' : dockTab === 'related' ? 'Related' : 'Up Next'}
                  </h3>
                  {dockTab === 'upnext' && (
                    <button
                      type="button"
                      className="btn-dock-save-queue"
                      onClick={() => {
                        setSelectedQueuePlaylistId(null);
                        setIsSaveQueueModalOpen(true);
                      }}
                      title="Save entire queue to playlist"
                      aria-label="Save entire queue to playlist"
                      disabled={!queue || queue.length === 0}
                    >
                      <ListPlus size={14} />
                    </button>
                  )}
                </div>
                <div className="dock-nav-tabs">
                  <button
                    type="button"
                    className={`dock-tab-btn ${dockTab === 'upnext' ? 'active' : ''}`}
                    onClick={() => setDockTab('upnext')}
                  >
                    Queue
                  </button>
                  <button
                    type="button"
                    className={`dock-tab-btn ${dockTab === 'lyrics' ? 'active' : ''}`}
                    onClick={() => setDockTab('lyrics')}
                  >
                    Lyrics
                  </button>
                  <button
                    type="button"
                    className={`dock-tab-btn ${dockTab === 'related' ? 'active' : ''}`}
                    onClick={() => setDockTab('related')}
                  >
                    Related
                  </button>
                </div>
              </div>
            </div>

            {/* TAB CONTENT 1: UP NEXT RADIO QUEUE */}
            {dockTab === 'upnext' && (
              <div className="dock-tab-content">
                <div className="dock-queue-list">
                  {queue.map((track, qIdx) => {
                    const isCurrentlyPlaying = queueIndex === qIdx;
                    return (
                      <div
                        key={`q-${track.videoId}-${qIdx}`}
                        ref={isCurrentlyPlaying ? activeQueueItemRef : null}
                        className={`dock-queue-item ${isCurrentlyPlaying ? 'active-playing' : ''}`}
                        onClick={() => {
                          userRequestedPauseRef.current = false;
                          markTransitioning();
                          const resolvedVid = track.videoId || track.youtubeId || (typeof track.id === 'string' && track.id.startsWith('yt-') ? track.id.replace('yt-', '') : track.id);
                          if (currentTrack?.videoId === resolvedVid && ytPlayer && typeof ytPlayer.seekTo === 'function') {
                            setCurrentTime(0);
                            try {
                              ytPlayer.seekTo(0, true);
                              ytPlayer.playVideo();
                            } catch {}
                            setIsPlaying(true);
                            return;
                          }
                          setQueueIndex(qIdx);
                          queueIndexRef.current = qIdx;
                          const normTrack = { ...track, videoId: resolvedVid };
                          setCurrentTrack(normTrack);
                          currentTrackRef.current = normTrack;
                          if (normTrack.duration && Number(normTrack.duration) > 0) {
                            setDuration(Number(normTrack.duration));
                          }
                          setIsPlaying(true);
                          setCurrentTime(0);
                          persistPlaybackSession(0, normTrack, queue, qIdx);
                          if (ytPlayer && typeof ytPlayer.loadVideoById === 'function' && normTrack.videoId) {
                            try {
                              ytPlayer.loadVideoById(normTrack.videoId, 0);
                              ytPlayer.playVideo();
                            } catch (err) {}
                          }
                        }}
                      >
                        <div className="queue-thumb-wrap">
                          <img src={track.cover} alt={track.title} loading="lazy" />
                          {isCurrentlyPlaying && (
                            <div className={`playing-soundwave-indicator ${isPlaying ? 'is-animating' : 'is-paused'}`}>
                              <span className="bar bar-1" />
                              <span className="bar bar-2" />
                              <span className="bar bar-3" />
                            </div>
                          )}
                        </div>
                        <div className="queue-track-meta">
                          <span className="queue-track-title">{track.title}</span>
                          <span className="queue-track-artist">{track.artist}</span>
                        </div>
                        <span className="queue-track-time">{track.durationFormatted || '3:30'}</span>
                        <button
                          type="button"
                          className="btn-track-menu queue-item-menu-btn"
                          onClick={(e) => handleOpenTrackMenu(e, track, { isQueueItem: true, qIdx })}
                          title="Track options"
                        >
                          <MoreVertical size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: LIVE SYNCED LYRICS */}
            {dockTab === 'lyrics' && (
              <div
                className="dock-tab-content lyrics-tab-wrap"
                ref={lyricsContainerRef}
                onScroll={handleLyricsUserScroll}
              >
                <div className="lyrics-header-meta">
                  <div className="lyrics-meta-left">
                    {currentTrack?.cover && (
                      <div className="lyrics-thumb-badge">
                        <img src={currentTrack.cover} alt={currentTrack.title} />
                      </div>
                    )}
                    <div className="lyrics-title-group">
                      <span className="lyrics-song-title">{currentTrack?.title}</span>
                      <span className="lyrics-artist-name">{currentTrack?.artist}</span>
                    </div>
                  </div>
                  {lyricsData?.type === 'synced' && (
                    <span className="lyrics-badge-tag is-synced">
                      <Sparkles size={11} />
                      <span>Live Synced</span>
                    </span>
                  )}
                  {lyricsData?.type === 'plain' && (
                    <span className="lyrics-badge-tag is-plain">
                      <span>Lyrics</span>
                    </span>
                  )}
                </div>

                {isLyricsLoading ? (
                  <div className="lyrics-loading-box">
                    <div className="ceramic-spinner" />
                    <span>Syncing lyrics...</span>
                  </div>
                ) : lyricsData?.type === 'synced' && lyricsData?.lines?.length > 0 ? (
                  <div className="lyrics-scroller">
                    <div className="lyrics-hint-row">
                      <span className="lyrics-hint-badge">Tap any line to jump</span>
                    </div>
                    {lyricsData.lines.map((line, idx) => {
                      const isActive = activeLyricIndex === idx;
                      const isPast = activeLyricIndex > idx;
                      const isFuture = activeLyricIndex < idx;

                      return (
                        <p
                          key={`lrc-${idx}-${line.time}`}
                          data-index={idx}
                          className={`lyrics-line ${isActive ? 'active-line' : ''} ${isPast ? 'past-line' : ''} ${isFuture ? 'future-line' : ''}`}
                          onClick={() => handleLyricLineClick(line.time)}
                          title={`Click to jump to ${formatTime(line.time)}`}
                        >
                          <span className="line-text">{line.text}</span>
                        </p>
                      );
                    })}
                    {lyricsData?.provider && (
                      <div className="lyrics-footer-note">
                        <span>Lyrics provided by Muse</span>
                      </div>
                    )}
                  </div>
                ) : lyricsData?.type === 'plain' && lyricsData?.plainText ? (
                  <div className="lyrics-plain-scroller">
                    <div className="lyrics-plain-text">
                      {lyricsData.plainText}
                    </div>
                    {lyricsData?.provider && (
                      <div className="lyrics-footer-note">
                        <span>Lyrics provided by Muse</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="lyrics-empty-state">
                    <div className="lyrics-empty-icon-wrap">
                      <MicOff size={24} />
                    </div>
                    <h4 className="lyrics-empty-title">No lyrics available</h4>
                    <p className="lyrics-empty-sub">
                      Enjoy the high-fidelity sound on MUSE
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 3: RELATED VIDEOS FROM YOUTUBE */}
            {dockTab === 'related' && (
              <div className="dock-tab-content related-tab-wrap">
                <span className="related-section-header">Recommended for you</span>
                {isRelatedLoading ? (
                  <div className="section-loading-box">
                    <div className="ceramic-spinner" />
                  </div>
                ) : (
                  <div className="related-items-list">
                    {relatedTracks.map((rel) => (
                      <div
                        key={`rel-${rel.videoId}`}
                        className="related-video-card"
                        onClick={() => handlePlayTrack(rel, true)}
                      >
                        <img src={rel.cover} alt={rel.title} className="related-thumb" />
                        <div className="related-info">
                          <span className="related-title">{rel.title}</span>
                          <span className="related-artist">{rel.artist}</span>
                          <span className="related-views">{rel.views}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* ====================================================================
          4. FIXED BOTTOM PLAYER BAR (DOCKED AT BOTTOM, NOT FLOATING!)
          - Expands to full player stage on click anywhere outside controls
          ==================================================================== */}
      {hasPlayedTrack && currentTrack && (
        <footer
          className={`desktop-player-bar-dock ${isFullscreen ? 'dock-fullscreen' : ''} ${isFullscreen && !isHudVisible ? 'hud-faded' : ''}`}
          onClick={(e) => {
            if (isFullscreen) return;
            if (isScrubbingRef.current || justScrubbedRef.current) return;
            if (e.target.closest('button, input, a, .player-dock-progress-edge, .scrub-track-wrapper')) return;
            handleTogglePlayerExpand();
          }}
          title={activeNav === 'now-playing' ? (isFullscreen ? '' : 'Click to minimize player view') : 'Click to expand player view'}
        >
          {/* Top-Edge YouTube-Style Scrub Progress Bar with Dot Handle & Drag Pause */}
          <div
            ref={progressEdgeRef}
            className={`player-dock-progress-edge ${isScrubbing ? 'is-scrubbing' : ''}`}
            onMouseDown={handleScrubStart}
            onTouchStart={handleScrubStart}
            onClick={(e) => {
              e.stopPropagation();
            }}
            title={duration > 0 ? `${formatTime(isScrubbing ? Math.floor(scrubFraction * duration) : currentTime)} / ${formatTime(duration)}` : 'Seek'}
          >
            <div
              className="player-dock-progress-fill"
              style={{
                width: `${
                  isScrubbing
                    ? scrubFraction * 100
                    : duration > 0
                    ? (currentTime / duration) * 100
                    : 0
                }%`
              }}
            >
              <div className="player-dock-progress-handle" />
            </div>
          </div>

          <div className="player-dock-inner">
            {/* Left: Artwork + Track Title + Like Button */}
            <div className="player-left-section">
              <div
                className="player-artwork-capsule"
                onClick={handleTogglePlayerExpand}
                title={activeNav === 'now-playing' ? 'Click to minimize player view' : 'Click to expand player view'}
              >
                <img
                  src={currentTrack?.cover}
                  alt={currentTrack?.title || 'Track'}
                  className="player-artwork-img"
                />
              </div>

              <div
                className="player-info-column"
                onClick={() => {
                  setIsSearchDropdownOpen(false);
                  navigateTo('now-playing');
                }}
                title="Expand to Full Player"
              >
                <span className="player-track-name" title={currentTrack?.title || ''}>
                  {currentTrack?.title}
                </span>
                <span className="player-track-artist" title={currentTrack?.artist || ''}>
                  {currentTrack?.artist}
                </span>
              </div>

              <button
                type="button"
                className="btn-player-heart"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleLike(currentTrack);
                }}
                title={playerStore.isLiked(currentTrack.videoId || currentTrack.id) ? 'Liked' : 'Like'}
              >
                <Heart
                  size={18}
                  fill={playerStore.isLiked(currentTrack.videoId || currentTrack.id) ? '#E53935' : 'transparent'}
                  color={playerStore.isLiked(currentTrack.videoId || currentTrack.id) ? '#E53935' : 'var(--text-secondary)'}
                />
              </button>
            </div>

            {/* Center: Playback Buttons + Scrub Row */}
            <div className="player-center-section">
              <div className="player-media-buttons">
                <button
                  type="button"
                  className={`btn-media-ctrl ${isShuffle ? 'active-toggle' : ''}`}
                  onClick={handleToggleShuffle}
                  title="Shuffle"
                >
                  <Shuffle size={16} />
                </button>

                <button
                  type="button"
                  className="btn-media-ctrl"
                  onClick={handlePrevTrack}
                  title="Previous Track (Shift + ←)"
                >
                  <SkipBack size={18} />
                </button>

                <button
                  type="button"
                  className="btn-master-play"
                  onClick={handleTogglePlay}
                  title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                >
                  {isPlaying ? <Pause size={18} fill="#FFF" /> : <Play size={18} fill="#FFF" style={{ marginLeft: 2 }} />}
                </button>

                <button
                  type="button"
                  className="btn-media-ctrl"
                  onClick={() => handleNextTrack(true)}
                  title="Next Track (Shift + →)"
                >
                  <SkipForward size={18} />
                </button>

                <button
                  type="button"
                  className={`btn-media-ctrl btn-repeat-ctrl ${repeatMode !== 'off' ? 'active-toggle is-repeat-active' : ''} ${repeatMode === 'one' ? 'is-repeat-one' : ''}`}
                  onClick={handleCycleRepeat}
                  title={`Repeat: ${repeatMode === 'one' ? 'Repeat One' : repeatMode === 'all' ? 'Repeat All' : 'Off'}`}
                >
                  {repeatMode === 'one' ? <Repeat1 size={17} /> : <Repeat size={16} />}
                </button>
              </div>

              <span className="player-time-indicator">
                {formatTime(isScrubbing ? Math.floor(scrubFraction * duration) : currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right: Volume & Queue Toggles */}
            <div className="player-right-section">
              <div
                className="volume-control-wrap"
                onWheel={(e) => {
                  e.preventDefault();
                  adjustVolume(e.deltaY < 0 ? 0.05 : -0.05);
                }}
                title="Scroll wheel or Up/Down arrows to adjust volume"
              >
                <button
                  type="button"
                  className="btn-volume-icon"
                  onClick={handleToggleMute}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(e.target.value)}
                  className="player-volume-slider"
                  style={{ '--vol-fill': `${Math.round((isMuted ? 0 : volume) * 100)}%` }}
                  title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                />
              </div>

              <button
                type="button"
                className={`btn-player-side-icon ${isQueueOpen && dockTab === 'lyrics' ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeNav !== 'now-playing') {
                    navigateTo('now-playing');
                  }
                  if (isQueueOpen && dockTab === 'lyrics') {
                    setIsQueueOpen(false);
                  } else {
                    setIsQueueOpen(true);
                    setDockTab('lyrics');
                  }
                }}
                title="Toggle Synced Lyrics"
              >
                <Mic2 size={18} />
              </button>

              <button
                type="button"
                className={`btn-player-side-icon ${isQueueOpen && dockTab === 'upnext' ? 'active' : ''}`}
                onClick={() => {
                  if (isQueueOpen && dockTab === 'upnext') {
                    setIsQueueOpen(false);
                  } else {
                    setIsQueueOpen(true);
                    setDockTab('upnext');
                  }
                }}
                title="Toggle Up Next Queue"
              >
                <ListMusic size={19} />
              </button>

              <button
                type="button"
                className={`btn-player-side-icon ${isFullscreen ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFullscreen();
                }}
                title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Full Screen (f)'}
              >
                {isFullscreen ? <Minimize2 size={19} /> : <Maximize2 size={19} />}
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* New Playlist Modal */}
      {isNewPlaylistModalOpen && (
        <div className="playlist-modal-backdrop" onClick={() => setIsNewPlaylistModalOpen(false)}>
          <div className="playlist-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="playlist-modal-header">
              <h3 className="playlist-modal-title">New Playlist</h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setIsNewPlaylistModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreatePlaylistSubmit}>
              <div className="playlist-input-group">
                <label className="playlist-input-label">Title</label>
                <input
                  type="text"
                  required
                  placeholder="My Playlist"
                  value={newPlaylistTitle}
                  onChange={(e) => setNewPlaylistTitle(e.target.value)}
                  className="playlist-text-input"
                  autoFocus
                  disabled={isCreatingPlaylist}
                />
              </div>
              <div className="playlist-input-group" style={{ marginTop: 12 }}>
                <label className="playlist-input-label">Description (Optional)</label>
                <textarea
                  placeholder="Give your playlist a mood or description..."
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  className="playlist-text-input playlist-textarea"
                  disabled={isCreatingPlaylist}
                />
              </div>
              <div className="playlist-modal-actions">
                <button
                  type="button"
                  className="btn-playlist-cancel"
                  onClick={() => setIsNewPlaylistModalOpen(false)}
                  disabled={isCreatingPlaylist}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn-playlist-submit ${isCreatingPlaylist ? 'is-loading' : ''}`}
                  disabled={isCreatingPlaylist || !newPlaylistTitle.trim()}
                >
                  {isCreatingPlaylist ? (
                    <span className="btn-loading-flex">
                      <Loader2 size={15} className="spin-animate" />
                      <span>Creating...</span>
                    </span>
                  ) : (
                    <span>Create Playlist</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Equalizer Modal */}
      <EqualizerModal
        isOpen={isEqualizerOpen}
        onClose={() => setIsEqualizerOpen(false)}
      />

      {/* Global 3-Dots Track Action Menu */}
      {trackMenu && (
        <>
          <div
            className="track-menu-backdrop"
            onClick={() => setTrackMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setTrackMenu(null);
            }}
          />
          <div
            className="track-context-menu"
            style={{ top: trackMenu.y, left: trackMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="track-menu-item"
              onClick={() => {
                if (trackMenu.isQueueItem) {
                  handleMoveQueueTrackToPlayNext(trackMenu.qIdx);
                } else {
                  handlePlayNext(trackMenu.track);
                }
                setTrackMenu(null);
              }}
            >
              <ListPlus size={15} />
              <span>Play Next</span>
            </button>
            {!trackMenu.isQueueItem && (
              <button
                type="button"
                className="track-menu-item"
                onClick={() => {
                  handleAddToQueue(trackMenu.track);
                  setTrackMenu(null);
                }}
              >
                <ListMusic size={15} />
                <span>Add to Queue</span>
              </button>
            )}
            <button
              type="button"
              className="track-menu-item"
              onClick={() => {
                handleToggleLike(trackMenu.track);
                setTrackMenu(null);
              }}
            >
              <Heart
                size={15}
                fill={playerStore.isLiked(trackMenu.track.videoId || trackMenu.track.id) ? '#E53935' : 'transparent'}
                color={playerStore.isLiked(trackMenu.track.videoId || trackMenu.track.id) ? '#E53935' : 'currentColor'}
              />
              <span>
                {playerStore.isLiked(trackMenu.track.videoId || trackMenu.track.id)
                  ? 'Remove from Liked'
                  : 'Add to Liked'}
              </span>
            </button>
            <div className="track-menu-divider" />
            <button
              type="button"
              className="track-menu-item"
              onClick={() => {
                setAddToPlaylistTrack(trackMenu.track);
                setTrackMenu(null);
              }}
            >
              <FolderPlus size={15} />
              <span>Add to Playlist...</span>
            </button>
          </div>
        </>
      )}

      {/* Add to Playlist Selection Modal */}
      {addToPlaylistTrack && (
        <div className="playlist-modal-backdrop" onClick={() => setAddToPlaylistTrack(null)}>
          <div className="playlist-modal-card add-to-playlist-modal" onClick={(e) => e.stopPropagation()}>
            <div className="playlist-modal-header">
              <div className="modal-title-cluster" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="modal-title-icon-badge">
                  <FolderPlus size={18} />
                </div>
                <div>
                  <h3 className="playlist-modal-title" style={{ margin: 0, fontSize: 18, lineHeight: 1.2 }}>Add to Playlist</h3>
                  <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>Choose a playlist or create a new one</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setAddToPlaylistTrack(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Track Info Banner */}
            <div className="modal-track-preview">
              <img
                src={addToPlaylistTrack.cover}
                alt={addToPlaylistTrack.title}
                className="modal-preview-thumb"
              />
              <div className="modal-preview-info">
                <span className="modal-preview-title">{addToPlaylistTrack.title}</span>
                <span className="modal-preview-artist">{addToPlaylistTrack.artist}</span>
              </div>
            </div>

            {/* Create & Add Inline */}
            <div className="modal-create-pl-row">
              <input
                type="text"
                placeholder="New playlist name..."
                value={modalNewPlTitle}
                onChange={(e) => setModalNewPlTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateAndAddInModal();
                }}
                className="modal-new-pl-input"
                disabled={isCreatingInModal}
              />
              <button
                type="button"
                className="btn-modal-create-add"
                disabled={!modalNewPlTitle.trim() || isCreatingInModal}
                onClick={handleCreateAndAddInModal}
              >
                {isCreatingInModal ? <Loader2 size={13} className="spin-animate" /> : <Plus size={14} />}
                <span>Create & Add</span>
              </button>
            </div>

            {/* Playlists List */}
            <div className="modal-playlist-scroll">
              <span className="modal-section-label">Your Playlists</span>
              {playlists.filter((p) => !p.isLikedFolder).length === 0 ? (
                <div className="modal-no-playlists">
                  <p>No playlists yet. Type a title above to create one!</p>
                </div>
              ) : (
                playlists
                  .filter((p) => !p.isLikedFolder)
                  .map((pl) => {
                    const isAlreadyIn = (pl.tracks || []).some(
                      (t) =>
                        (t.videoId && t.videoId === addToPlaylistTrack.videoId) ||
                        (t.id && t.id === addToPlaylistTrack.id)
                    );
                    return (
                      <div
                        key={`modal-pl-${pl.id}`}
                        className={`modal-pl-row ${isAlreadyIn ? 'is-in-playlist' : ''}`}
                        onClick={() => {
                          if (!isAlreadyIn) {
                            playerStore.addTrackToPlaylist(pl.id, addToPlaylistTrack);
                            showToast(`Added "${addToPlaylistTrack.title}" to ${pl.title}`);
                            setAddToPlaylistTrack(null);
                          }
                        }}
                      >
                        <div className="modal-pl-art-wrap">
                          <PlaylistCoverArt playlist={pl} />
                        </div>
                        <div className="modal-pl-meta">
                          <span className="modal-pl-title">{pl.title}</span>
                          <span className="modal-pl-count">{pl.tracks?.length || 0} tracks</span>
                        </div>
                        <div className="modal-pl-action">
                          {isAlreadyIn ? (
                            <span className="badge-already-added">
                              <Check size={13} /> Added
                            </span>
                          ) : (
                            <span className="btn-modal-add-pl">
                              <Plus size={13} /> Add
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save Whole Queue to Playlist Modal */}
      {isSaveQueueModalOpen && (
        <div
          className="playlist-modal-backdrop"
          onClick={() => {
            if (!isSavingQueue) {
              setIsSaveQueueModalOpen(false);
            }
          }}
        >
          <div
            className="playlist-modal-card save-queue-modal ceramic-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="playlist-modal-header">
              <div className="modal-title-cluster" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="modal-title-icon-badge">
                  <ListPlus size={18} />
                </div>
                <div>
                  <h3 className="modal-main-title">Save Queue to Playlist</h3>
                  <span className="modal-sub-title">
                    {queue.length} track{queue.length === 1 ? '' : 's'} in current queue
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => {
                  if (!isSavingQueue) {
                    setIsSaveQueueModalOpen(false);
                  }
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Inline Playlist Creation */}
            <div className="modal-create-pl-row">
              <input
                type="text"
                placeholder="Create new playlist..."
                value={modalNewQueuePlTitle}
                onChange={(e) => setModalNewQueuePlTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreatePlaylistInSaveQueueModal();
                }}
                className="modal-new-pl-input"
                disabled={isCreatingQueuePl || isSavingQueue}
              />
              <button
                type="button"
                className="btn-modal-create-add"
                disabled={!modalNewQueuePlTitle.trim() || isCreatingQueuePl || isSavingQueue}
                onClick={handleCreatePlaylistInSaveQueueModal}
              >
                {isCreatingQueuePl ? (
                  <Loader2 size={13} className="spin-animate" />
                ) : (
                  <Plus size={14} />
                )}
                <span>Create</span>
              </button>
            </div>

            {/* Playlists List with Smart Duplicate Badges & Single-Select Toggle */}
            <div className="modal-playlist-scroll">
              <div className="modal-section-header-row">
                <span className="modal-section-label">Select Destination Playlist</span>
                {selectedQueuePlaylistId && (
                  <button
                    type="button"
                    className="btn-modal-clear-selection"
                    onClick={() => setSelectedQueuePlaylistId(null)}
                    disabled={isSavingQueue}
                  >
                    Deselect
                  </button>
                )}
              </div>

              {playlists.filter((p) => !p.isLikedFolder).length === 0 ? (
                <div className="modal-no-playlists">
                  <FolderPlus size={32} style={{ opacity: 0.35, marginBottom: 8 }} />
                  <p>No playlists found. Create one above to save this queue!</p>
                </div>
              ) : (
                playlists
                  .filter((p) => !p.isLikedFolder)
                  .map((pl) => {
                    const isSelected = selectedQueuePlaylistId === pl.id;

                    // Deduplication calculation
                    const existingCount = (queue || []).filter((qTrack) =>
                      (pl.tracks || []).some(
                        (t) =>
                          (t.videoId && qTrack.videoId && t.videoId === qTrack.videoId) ||
                          (t.id && qTrack.id && t.id === qTrack.id)
                      )
                    ).length;
                    const newCount = Math.max(0, (queue?.length || 0) - existingCount);
                    const isFullyInPlaylist = (queue?.length || 0) > 0 && newCount === 0;

                    return (
                      <div
                        key={`queue-modal-pl-${pl.id}`}
                        className={`modal-pl-row queue-modal-pl-item ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => {
                          if (isSavingQueue) return;
                          // Single-select toggle: clicking again deselects
                          setSelectedQueuePlaylistId((prev) => (prev === pl.id ? null : pl.id));
                        }}
                      >
                        <div className="modal-pl-art-wrap">
                          <PlaylistCoverArt playlist={pl} />
                        </div>
                        <div className="modal-pl-meta">
                          <span className="modal-pl-title">{pl.title}</span>
                          <span className="modal-pl-count">
                            {pl.tracks?.length || 0} track{pl.tracks?.length === 1 ? '' : 's'}
                          </span>
                        </div>

                        {/* Deduplication Status Badge */}
                        <div className="queue-pl-badge-wrap">
                          {isFullyInPlaylist ? (
                            <span className="queue-pl-badge all-saved" title="All tracks in queue are already in this playlist">
                              <Check size={11} /> All {existingCount} already saved
                            </span>
                          ) : existingCount > 0 ? (
                            <span className="queue-pl-badge partial" title={`${newCount} new tracks, ${existingCount} duplicate tracks will be skipped`}>
                              +{newCount} new ({existingCount} in playlist)
                            </span>
                          ) : (
                            <span className="queue-pl-badge new-all">
                              +{newCount} new tracks
                            </span>
                          )}
                        </div>

                        {/* Radio / Selection Check Circle */}
                        <div className={`queue-pl-selection-circle ${isSelected ? 'active' : ''}`}>
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Action Footer */}
            {(() => {
              const selectedPl = playlists.find((p) => p.id === selectedQueuePlaylistId);
              const existingCount = selectedPl
                ? (queue || []).filter((qTrack) =>
                    (selectedPl.tracks || []).some(
                      (t) =>
                        (t.videoId && qTrack.videoId && t.videoId === qTrack.videoId) ||
                        (t.id && qTrack.id && t.id === qTrack.id)
                    )
                  ).length
                : 0;
              const newCount = selectedPl ? Math.max(0, (queue?.length || 0) - existingCount) : 0;
              const hasPlaylists = playlists.filter((p) => !p.isLikedFolder).length > 0;

              let buttonText = 'Select a playlist';
              let isDisabled = true;

              if (!hasPlaylists) {
                buttonText = 'Create a playlist above first';
                isDisabled = true;
              } else if (!selectedPl) {
                buttonText = 'Select a playlist to save queue';
                isDisabled = true;
              } else if (newCount === 0) {
                buttonText = `All ${queue.length} tracks already in "${selectedPl.title}"`;
                isDisabled = true;
              } else {
                buttonText = `Save ${newCount} track${newCount > 1 ? 's' : ''} to "${selectedPl.title}"`;
                isDisabled = false;
              }

              return (
                <div className="save-queue-modal-footer">
                  <button
                    type="button"
                    className="btn-modal-save-queue-confirm"
                    disabled={isDisabled || isSavingQueue}
                    onClick={handleConfirmSaveQueue}
                  >
                    {isSavingQueue ? (
                      <>
                        <Loader2 size={15} className="spin-animate" />
                        <span>Checking & adding tracks...</span>
                      </>
                    ) : (
                      <>
                        <ListPlus size={15} />
                        <span>{buttonText}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 2-Step Sign Out Confirmation Modal */}
      {showSignOutModal && (
        <div
          className="playlist-modal-backdrop signout-modal-backdrop"
          onClick={() => {
            if (signOutStatus === 'idle') {
              setShowSignOutModal(false);
            }
          }}
        >
          <div
            className="playlist-modal-card ceramic-modal signout-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {signOutStatus === 'idle' && (
              <div className="signout-modal-idle-content">
                <div className="signout-modal-header">
                  <div className="modal-title-cluster" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="modal-title-icon-badge signout-icon-badge">
                      <LogOut size={18} />
                    </div>
                    <div>
                      <h3 className="modal-main-title">Sign Out</h3>
                      <span className="modal-sub-title">Confirm session termination</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-close-modal"
                    onClick={() => setShowSignOutModal(false)}
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="signout-user-preview-pill">
                  <div className="signout-preview-avatar">
                    {userProfile?.photoURL ? (
                      <img src={userProfile.photoURL} alt={userName} />
                    ) : (
                      userName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="signout-preview-meta">
                    <span className="signout-preview-name">{userName}</span>
                    <span className="signout-preview-email">{userProfile?.email || 'listener@melo.app'}</span>
                  </div>
                </div>

                <p className="signout-confirm-message">
                  Are you sure you want to sign out of MUSE? Your saved playlists and listening history remain safe and will be restored next time you sign in.
                </p>

                <div className="signout-modal-actions">
                  <button
                    type="button"
                    className="btn-signout-cancel"
                    onClick={() => setShowSignOutModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-signout-confirm"
                    onClick={handleConfirmSignOut}
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}

            {signOutStatus === 'loading' && (
              <div className="signout-modal-status-view">
                <div className="signout-spinner-circle">
                  <Loader2 size={36} className="spin-animate" />
                </div>
                <h3 className="signout-status-title">Signing out...</h3>
                <p className="signout-status-sub">Safely securing your session</p>
              </div>
            )}

            {signOutStatus === 'success' && (
              <div className="signout-modal-status-view">
                <div className="signout-tick-circle">
                  <Check size={32} strokeWidth={3} />
                </div>
                <h3 className="signout-status-title">Signed Out Successfully</h3>
                <p className="signout-status-sub">Returning to sign in...</p>
              </div>
            )}

            {signOutStatus === 'failed' && (
              <div className="signout-modal-status-view">
                <div className="signout-failed-circle">
                  <X size={30} strokeWidth={2.8} />
                </div>
                <h3 className="signout-status-title">Sign Out Failed</h3>
                <p className="signout-status-sub">Could not complete network request, but you can still sign out locally.</p>
                <div className="signout-modal-actions" style={{ marginTop: 18 }}>
                  <button
                    type="button"
                    className="btn-signout-cancel"
                    onClick={() => {
                      setShowSignOutModal(false);
                      setSignOutStatus('idle');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-signout-confirm"
                    onClick={() => {
                      setShowSignOutModal(false);
                      setSignOutStatus('idle');
                      if (onSignOut) onSignOut();
                    }}
                  >
                    Sign Out Anyway
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* YouTube-Style Arrow Key Seek Feedback Badge */}
      {seekFeedback.visible && (
        <div
          key={seekFeedback.animKey}
          className={`yt-seek-feedback-badge seek-${seekFeedback.direction} ${isFullscreen ? 'in-fullscreen' : ''}`}
          aria-live="polite"
        >
          <div className="yt-seek-feedback-content">
            {seekFeedback.direction === 'backward' ? (
              <>
                <svg className="yt-seek-icon rewind-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
                </svg>
                <span className="yt-seek-text">-{seekFeedback.seconds} seconds</span>
              </>
            ) : (
              <>
                <span className="yt-seek-text">+{seekFeedback.seconds} seconds</span>
                <svg className="yt-seek-icon forward-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
                </svg>
              </>
            )}
          </div>
        </div>
      )}
      {/* In-App Artist Updater Modal */}
      <ManageArtistsModal
        isOpen={isArtistModalOpen}
        onClose={() => {
          setIsArtistModalOpen(false);
          if (activeNav !== 'home') {
            navigateTo('home');
          }
          const stage = document.querySelector('.desktop-center-stage');
          if (stage) stage.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        currentArtists={userArtists}
        onSave={handleSaveArtists}
        onPausePlayback={handlePausePlayback}
        isSaving={isSavingArtists}
      />
    </div>
  );
}
