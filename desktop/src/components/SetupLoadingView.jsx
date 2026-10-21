import React, { useState, useEffect } from 'react';
import { CURATED_ARTISTS } from '../data/curatedArtists';

export function SetupLoadingView({ selectedArtistIds = [], onComplete }) {
  const [percent, setPercent] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  // Map selected IDs or artist objects to structured artist display items
  const selectedArtists = selectedArtistIds.map((item, index) => {
    if (typeof item === 'object' && item !== null) {
      return {
        id: item.id || `artist-${index}`,
        name: item.name || 'Artist',
        photo: item.photo || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
        genre: item.genre || 'World Artist'
      };
    }
    const id = String(item || '');
    const found = CURATED_ARTISTS.find((a) => a.id === id);
    if (found) return found;
    return {
      id,
      name: id ? id.replace('artist-', '').replace(/-/g, ' ').toUpperCase() : `Artist ${index + 1}`,
      photo: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
      genre: 'World Artist'
    };
  });

  const phrases = [
    { threshold: 0, title: 'Setting Up Your Vibe', sub: 'Analyzing your chosen artists & acoustic sound profiles...' },
    { threshold: 24, title: 'Curating Custom Mixes', sub: 'Gathering top tracks, live performances & master recordings...' },
    { threshold: 52, title: 'Connecting Streaming Engine', sub: 'Linking high-fidelity audio streams & ad-free video theater...' },
    { threshold: 76, title: 'Building Your Sonic Vault', sub: 'Preparing cloud sync, offline caching & personalized daily radio...' },
    { threshold: 92, title: 'Finalizing Master Tuner', sub: 'Your personal PC music sanctuary is ready!' }
  ];

  // Find active phrase
  const activePhrase = phrases.reduce((acc, curr) => (percent >= curr.threshold ? curr : acc), phrases[0]);

  // SVG circle calculations
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - percent / 100);

  useEffect(() => {
    const duration = 7500; // 7.5 seconds complete experience
    const intervalTime = 60;
    const step = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setPercent((prev) => {
        const next = prev + step;
        if (next >= 100) {
          clearInterval(timer);
          triggerSuccess();
          return 100;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);

  const triggerSuccess = () => {
    setIsSuccess(true);
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 2200);
  };

  return (
    <div className="desktop-setup-loading-wrapper">
      {/* Top Brand Bar */}
      <header className="setup-top-bar">
        <div className="setup-brand-pill">
          <div className="setup-brand-dot" />
          <span className="setup-brand-text">MUSE Curator AI</span>
        </div>

        <div className="setup-live-pill">
          <span className="live-pulse-dot" />
          <span>Curating Vault</span>
        </div>
      </header>

      {/* Main Cosmic Stage: Orbital Floating Artists + Center Pulse */}
      <main className="setup-cosmic-stage">
        {/* Center Luxury Circular Pulse Loader / Success Checkmark */}
        <div className={`setup-center-cluster ${isSuccess ? 'success-mode' : ''}`}>
          {!isSuccess ? (
            <div className="setup-center-pulse">
              <svg className="setup-spinner-svg" viewBox="0 0 130 130">
                <circle cx="65" cy="65" r={radius} className="spinner-bg-circle" />
                <circle
                  cx="65"
                  cy="65"
                  r={radius}
                  className="spinner-accent-circle"
                  style={{
                    strokeDasharray: circumference,
                    strokeDashoffset: strokeOffset
                  }}
                />
              </svg>
              <div className="setup-percent-number">{Math.floor(percent)}%</div>
            </div>
          ) : (
            <div className="setup-success-card animate-reveal">
              <div className="setup-check-wrap">
                <svg className="setup-check-svg" viewBox="0 0 100 100" fill="none">
                  {/* Dark green outline circle */}
                  <circle cx="50" cy="50" r="38" stroke="#1E7227" strokeWidth="8" className="setup-check-ring" />
                  {/* Bold checkmark punching through rim */}
                  <path d="M 32 53 L 46 67 L 82 24" stroke="#1E7227" strokeWidth="9.5" strokeLinecap="round" strokeLinejoin="round" className="setup-check-tick" />
                </svg>
              </div>
              <div className="setup-success-title">Profile All Set Up</div>
            </div>
          )}
        </div>

        {/* Selected Artist Bubbles Floating Orbits across Widescreen */}
        <div className={`setup-artists-constellation ${isSuccess ? 'fade-away' : ''}`}>
          {selectedArtists.slice(0, 8).map((artist, i) => (
            <div
              key={artist.id}
              className={`setup-floating-bubble setup-pos-${(i % 8) + 1}`}
              title={artist.name}
            >
              <div className="setup-bubble-inner">
                <div
                  className="setup-bubble-mask"
                  style={{ clipPath: 'url(#flower-mask-artist)' }}
                >
                  <img src={artist.photo} alt={artist.name} />
                </div>
                <span className="setup-bubble-name">{artist.name}</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom Status & Linear Progress Bar */}
      <footer className="setup-info-bottom">
        <h2 className="setup-headline">
          {isSuccess ? 'Profile All Set Up' : activePhrase.title}
        </h2>
        <p className="setup-substatus">
          {isSuccess ? 'Welcome to MUSE PC! Opening your personalized music sanctuary...' : activePhrase.sub}
        </p>

        <div className="setup-linear-track">
          <div
            className={`setup-linear-fill ${isSuccess ? 'success-fill' : ''}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </footer>
    </div>
  );
}
