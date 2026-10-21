import React, { useEffect, useRef } from 'react';

/**
 * YouTubePlayerHost
 * Persistent YouTube IFrame Player wrapper.
 * Stays mounted throughout the entire app session so audio playback never stops during page transitions.
 * Supports dual rendering:
 * - When playerMode === 'video': mounts into the visible 16:9 viewport
 * - When playerMode === 'song': mounts into a hidden background host while audio plays continuously
 */
export function YouTubePlayerHost({
  videoId,
  isPlaying,
  volume = 0.85,
  isMuted = false,
  playerMode = 'video', // 'video' | 'song'
  onReady,
  onStateChange,
  onTimeUpdate,
  onError
}) {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const timeIntervalRef = useRef(null);
  const currentLoadedVideoIdRef = useRef(null);

  // Keep references to latest callbacks so YT event listeners are never stale
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Initialize YouTube IFrame API script
  useEffect(() => {
    const checkAndInit = () => {
      if (window.YT && window.YT.Player && containerRef.current) {
        if (!playerRef.current) {
          try {
            const initialVid = videoId || 'M7lc1UVf-VE';
            currentLoadedVideoIdRef.current = initialVid;
            playerRef.current = new window.YT.Player(containerRef.current, {
              height: '100%',
              width: '100%',
              videoId: initialVid,
              playerVars: {
                autoplay: 1,
                enablejsapi: 1,
                controls: 0,
                disablekb: 1,
                fs: 0,
                rel: 0,
                playsinline: 1,
                modestbranding: 1,
                iv_load_policy: 3,
                cc_load_policy: 0,
                origin: typeof window !== 'undefined' ? window.location.origin : undefined
              },
              events: {
                onReady: (event) => {
                  playerRef.current = event.target;
                  try {
                    event.target.setVolume(Math.round(volume * 100));
                    if (isMuted) event.target.mute();
                    else event.target.unMute();
                  } catch {}
                  if (onReadyRef.current) onReadyRef.current(event.target);

                  // Immediately load and play the active video when player is ready
                  if (videoId) {
                    currentLoadedVideoIdRef.current = videoId;
                    try {
                      event.target.loadVideoById(videoId, 0);
                      if (isPlaying) {
                        event.target.playVideo();
                      }
                    } catch (err) {
                      console.warn('onReady video load error:', err);
                    }
                  } else if (isPlaying) {
                    try {
                      event.target.playVideo();
                    } catch {}
                  }
                },
                onStateChange: (event) => {
                  if (onStateChangeRef.current) onStateChangeRef.current(event.data, event.target);
                },
                onError: (err) => {
                  console.warn('YouTube IFrame Player error:', err.data);
                  if (onErrorRef.current) onErrorRef.current(err);
                }
              }
            });
          } catch (err) {
            console.warn('YT Player init error:', err);
          }
        }
      } else {
        setTimeout(checkAndInit, 120);
      }
    };

    if (!window.YT) {
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        document.body.appendChild(tag);
      }
      const prevOnReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevOnReady === 'function') prevOnReady();
        checkAndInit();
      };
    }

    checkAndInit();

    return () => {
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
    };
  }, []);

  // Track progress polling (every 250ms)
  useEffect(() => {
    if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);

    timeIntervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const current = playerRef.current.getCurrentTime() || 0;
          const dur = typeof playerRef.current.getDuration === 'function' ? (playerRef.current.getDuration() || 0) : 0;
          if (onTimeUpdateRef.current) {
            onTimeUpdateRef.current(current, dur);
          }
        } catch {}
      }
    }, 250);

    return () => {
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
    };
  }, []);

  // Handle videoId change & ensure immediate autoplay
  useEffect(() => {
    if (!videoId) return;
    if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
      if (currentLoadedVideoIdRef.current !== videoId) {
        currentLoadedVideoIdRef.current = videoId;
        try {
          playerRef.current.loadVideoById(videoId, 0);
          if (isPlaying && typeof playerRef.current.playVideo === 'function') {
            playerRef.current.playVideo();
          }
        } catch (e) {
          console.warn('Load video error:', e);
        }
      } else if (isPlaying && typeof playerRef.current.playVideo === 'function') {
        const state = typeof playerRef.current.getPlayerState === 'function' ? playerRef.current.getPlayerState() : -1;
        if (state !== 1 && state !== 3) {
          try {
            playerRef.current.playVideo();
          } catch {}
        }
      }
    }
  }, [videoId, isPlaying]);

  // Handle Play/Pause
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
      try {
        if (isPlaying) {
          playerRef.current.playVideo();
        } else {
          playerRef.current.pauseVideo();
        }
      } catch {}
    }
  }, [isPlaying]);

  // Handle Volume & Mute
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      try {
        playerRef.current.setVolume(Math.round(volume * 100));
        if (isMuted) {
          playerRef.current.mute();
        } else {
          playerRef.current.unMute();
        }
      } catch {}
    }
  }, [volume, isMuted]);

  return (
    <div
      className={`muse-yt-frame-wrapper ${playerMode === 'song' ? 'song-mode-hidden' : 'video-mode-visible'}`}
    >
      <div ref={containerRef} id="muse-yt-iframe-slot" />
    </div>
  );
}
