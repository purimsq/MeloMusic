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
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      document.body.appendChild(tag);
    }

    const checkAndInit = () => {
      if (window.YT && window.YT.Player && containerRef.current) {
        if (!playerRef.current) {
          try {
            currentLoadedVideoIdRef.current = videoId || '09R8_2nJtjg';
            playerRef.current = new window.YT.Player(containerRef.current, {
              height: '100%',
              width: '100%',
              videoId: videoId || '09R8_2nJtjg',
              playerVars: {
                autoplay: isPlaying ? 1 : 0,
                controls: playerMode === 'video' ? 1 : 0,
                disablekb: 1,
                fs: 0,
                rel: 0,
                playsinline: 1,
                modestbranding: 1,
                origin: window.location.origin
              },
              events: {
                onReady: (event) => {
                  event.target.setVolume(Math.round(volume * 100));
                  if (isMuted) event.target.mute();
                  if (onReadyRef.current) onReadyRef.current(event.target);
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
        setTimeout(checkAndInit, 150);
      }
    };

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
          const duration = playerRef.current.getDuration() || 0;
          if (onTimeUpdateRef.current && duration > 0) {
            onTimeUpdateRef.current(current, duration);
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
    if (playerRef.current && videoId && typeof playerRef.current.loadVideoById === 'function') {
      if (currentLoadedVideoIdRef.current !== videoId) {
        currentLoadedVideoIdRef.current = videoId;
        try {
          playerRef.current.loadVideoById({
            videoId: videoId,
            startSeconds: 0
          });
          const playTimer = setTimeout(() => {
            try {
              if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
                playerRef.current.playVideo();
              }
            } catch {}
          }, 80);
          return () => clearTimeout(playTimer);
        } catch (e) {
          console.warn('Load video error:', e);
        }
      }
    }
  }, [videoId]);

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
