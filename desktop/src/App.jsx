import React, { useState, useEffect } from 'react';
import { AmbientClouds } from './components/AmbientClouds';
import { OnboardingAuthView } from './components/OnboardingAuthView';
import { ArtistSelectView } from './components/ArtistSelectView';
import { SetupLoadingView } from './components/SetupLoadingView';
import { MainAppView } from './components/MainAppView';
import { authService } from './services/authService';

export function App() {
  const [currentView, setCurrentView] = useState('main'); // default to 'main' for immediate preview of the requested desktop UI, with quick switcher
  const [selectedArtists, setSelectedArtists] = useState([]);
  const [userProfile, setUserProfile] = useState(() => authService.getUserProfile());

  // Real-time session listener ("webhook") that immediately senses Google or Email login events
  useEffect(() => {
    const unsubscribe = authService.subscribe((profile) => {
      if (profile && profile.isLoggedIn) {
        setUserProfile(profile);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (profile) => {
    setUserProfile(profile);
    setCurrentView('artist-select');
  };

  const handleSkipToArtists = () => {
    setCurrentView('artist-select');
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
    setCurrentView('auth');
  };

  return (
    <div className="muse-desktop-app">
      {/* Global Ambient 3D Sculpted Ceramic Clouds in Background */}
      <AmbientClouds />

      {/* Development Quick-Switch Bar (discreet, top floating badge) */}
      <div className="dev-view-switcher">
        <button
          type="button"
          className={`btn-dev-switch ${currentView === 'main' ? 'active' : ''}`}
          onClick={() => setCurrentView('main')}
        >
          App Player
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
            onSkipToArtists={handleSkipToArtists}
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
