import React, { useState, useEffect } from 'react';
import { AmbientClouds } from './components/AmbientClouds';
import { OnboardingAuthView } from './components/OnboardingAuthView';
import { ArtistSelectView } from './components/ArtistSelectView';
import { SetupLoadingView } from './components/SetupLoadingView';
import { MainAppView } from './components/MainAppView';
import { authService } from './services/authService';

export function App() {
  const initialProfile = authService.getUserProfile();
  const [userProfile, setUserProfile] = useState(initialProfile);
  // Real user flow: If already logged in, enter 'main'. If first-time install / not logged in, land on 'auth' (Sign Up).
  const [currentView, setCurrentView] = useState(() => {
    return initialProfile && initialProfile.isLoggedIn ? 'main' : 'auth';
  });
  const [selectedArtists, setSelectedArtists] = useState([]);

  // Real-time session listener that immediately senses login / logout events
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
      document.body.classList.add('is-electron');
    }
    const unsubscribe = authService.subscribe((profile) => {
      if (profile && profile.isLoggedIn) {
        setUserProfile(profile);
      } else if (!profile) {
        setUserProfile(null);
        setCurrentView('auth');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (profile) => {
    setUserProfile(profile);
    // If user already has favorite artists, enter main. If new signup, proceed to taste onboarding.
    if (profile?.favoriteArtists && profile.favoriteArtists.length > 0) {
      setCurrentView('main');
    } else {
      setCurrentView('artist-select');
    }
  };

  const handleBackToAuth = () => {
    setCurrentView('auth');
  };

  // Move to the Setting Up Loading screen
  const handleArtistsComplete = (artists) => {
    setSelectedArtists(artists);
    setCurrentView('setup-loading');
  };

  // After Setting Up finishes with the success checkmark -> launch the full desktop app!
  const handleSetupComplete = () => {
    setCurrentView('main');
  };

  const handleSignOut = () => {
    authService.signOut();
    setUserProfile(null);
    setCurrentView('auth');
  };

  return (
    <div className="muse-desktop-app">
      {/* Global Ambient 3D Sculpted Ceramic Clouds in Background */}
      <AmbientClouds />

      {/* Testing Quick-Switch Menu (floating discreet pill for test preview) */}
      <div className="dev-view-switcher">
        <button
          type="button"
          className={`btn-dev-switch ${currentView === 'main' ? 'active' : ''}`}
          onClick={() => setCurrentView('main')}
        >
          App View
        </button>
        <button
          type="button"
          className={`btn-dev-switch ${currentView === 'auth' ? 'active' : ''}`}
          onClick={() => setCurrentView('auth')}
        >
          Auth Screen
        </button>
        <button
          type="button"
          className={`btn-dev-switch ${currentView === 'artist-select' ? 'active' : ''}`}
          onClick={() => setCurrentView('artist-select')}
        >
          Artist Taste
        </button>
        <button
          type="button"
          className={`btn-dev-switch ${currentView === 'setup-loading' ? 'active' : ''}`}
          onClick={() => setCurrentView('setup-loading')}
        >
          Curator Setup
        </button>
      </div>

      {/* Main View Layer */}
      <div className="view-layer-container">
        {currentView === 'auth' && (
          <OnboardingAuthView
            onAuthSuccess={handleAuthSuccess}
          />
        )}

        {currentView === 'artist-select' && (
          <ArtistSelectView
            onBack={handleBackToAuth}
            onComplete={handleArtistsComplete}
          />
        )}

        {currentView === 'setup-loading' && (
          <SetupLoadingView
            selectedArtistIds={selectedArtists}
            onComplete={handleSetupComplete}
          />
        )}

        {currentView === 'main' && (
          <MainAppView
            userProfile={userProfile}
            onSignOut={handleSignOut}
          />
        )}
      </div>
    </div>
  );
}

export default App;
