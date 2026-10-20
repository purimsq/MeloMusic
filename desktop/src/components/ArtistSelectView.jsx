import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Search, Check, Sparkles, Loader2 } from 'lucide-react';
import { artistService } from '../services/artistService';
import { authService } from '../services/authService';

export function ArtistSelectView({ onBack, onComplete }) {
  const MIN_ARTISTS = 3;
  // Strictly start empty with 0 selected artists (no auto-selection)
  const [selectedOrder, setSelectedOrder] = useState([]);
  const [selectedArtistIds, setSelectedArtistIds] = useState(() => new Set());
  const [allArtists, setAllArtists] = useState(() => artistService.getCuratedArtists());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [alertNotice, setAlertNotice] = useState('');
  
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedCount = selectedArtistIds.size;
  const isReady = selectedCount >= MIN_ARTISTS;
  const remaining = Math.max(0, MIN_ARTISTS - selectedCount);

  // Toggle artist selection:
  // - When selected: moves to top of list
  // - When deselected: returns to its original position in the list
  const handleToggleArtist = (artistId) => {
    setSelectedArtistIds((prevSet) => {
      const nextSet = new Set(prevSet);
      if (nextSet.has(artistId)) {
        nextSet.delete(artistId);
        // Remove from selected order so it returns to original position
        setSelectedOrder((prevOrder) => prevOrder.filter((id) => id !== artistId));
      } else {
        nextSet.add(artistId);
        // Put newly selected artist at the top of selected items
        setSelectedOrder((prevOrder) => [artistId, ...prevOrder.filter((id) => id !== artistId)]);
      }
      return nextSet;
    });
  };

  // Scroll to search input and place focus cursor
  const handleScrollToSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Small timeout to ensure smooth scroll completes before focus
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          const len = searchInputRef.current.value.length;
          searchInputRef.current.setSelectionRange(len, len);
        }
      }, 250);
    }
  };

  // Live search handler with debouncing and worldwide API integration
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const worldwideResults = await artistService.searchArtistsWorldwide(q);
        if (worldwideResults && worldwideResults.length > 0) {
          setAllArtists((prev) => {
            const existingNames = new Set(prev.map((a) => a.name.toLowerCase()));
            const newOnes = worldwideResults.filter((a) => !existingNames.has(a.name.toLowerCase()));
            return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
          });
        }
      } catch (err) {
        console.warn('Artist search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(searchTimeoutRef.current);
  }, [searchQuery]);

  // Compute ordered artists list:
  // 1. Selected artists are placed at the top (in order of selection)
  // 2. Unselected artists follow, preserving their exact original order
  const artistMap = new Map(allArtists.map((a) => [a.id, a]));
  const selectedArtistsList = selectedOrder
    .map((id) => artistMap.get(id))
    .filter(Boolean);
  const unselectedArtistsList = allArtists.filter((artist) => !selectedArtistIds.has(artist.id));
  const combinedOrderedArtists = [...selectedArtistsList, ...unselectedArtistsList];

  // Apply search query filter if active
  const filteredArtists = combinedOrderedArtists.filter((artist) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      artist.name.toLowerCase().includes(q) ||
      (artist.genre && artist.genre.toLowerCase().includes(q))
    );
  });

  // Handle Complete
  const handleContinue = () => {
    if (!isReady) {
      setAlertNotice(`Please choose at least ${MIN_ARTISTS} artists to craft your personalized vault.`);
      setTimeout(() => setAlertNotice(''), 4000);
      return;
    }
    const selectedList = (selectedOrder.length > 0 ? selectedOrder : Array.from(selectedArtistIds)).map((id) => {
      const art = artistMap.get(id);
      return art ? { id: art.id, name: art.name, genre: art.genre, photo: art.photo, topSongs: art.topSongs } : id;
    });
    authService.setFavoriteArtists(selectedList);
    onComplete(selectedList);
  };

  return (
    <div className="desktop-artist-select-wrapper">
      {/* Top Header Bar */}
      <header className="artist-select-header">
        <button
          type="button"
          className="btn-circle-back"
          onClick={onBack}
          title="Return to welcome screen"
        >
          <ChevronLeft size={22} />
          <span>Back</span>
        </button>

        {/* Progress Tracker */}
        <div className="artist-progress-container">
          <div className="taste-label-row">
            <span className="taste-label">Sonic Taste DNA</span>
            <span className="taste-metric">{Math.min(100, Math.round((selectedCount / MIN_ARTISTS) * 100))}%</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${Math.min(100, (selectedCount / MIN_ARTISTS) * 100)}%` }}
            />
          </div>
        </div>

        {/* Action Button on Header for quick access on Desktop */}
        <div className="header-action-slot">
          <button
            type="button"
            className={`btn-header-continue ${isReady ? 'ready' : ''}`}
            disabled={!isReady}
            onClick={handleContinue}
          >
            <Sparkles size={16} />
            <span>{isReady ? 'Complete Vault Setup' : `Pick ${remaining} More`}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="artist-select-main">
        {/* Title & Search Section */}
        <div className="artist-heading-block">
          <span className="artist-eyebrow">Personalization Engine</span>
          <h1 className="artist-main-title">
            Choose <span>Your Favorite Artists</span>
          </h1>
          <p className="artist-subheading">
            Select at least 3 artists to train the PC recommendation engine and craft your dynamic daily mixes.
          </p>

          {/* Search Bar */}
          <div className="artist-desktop-search">
            <Search size={19} className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="search-input"
              placeholder="Search any artist on Spotify / YouTube worldwide..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {isSearching && <Loader2 size={18} className="search-spinner" />}
          </div>
        </div>

        {/* Alert Notice if attempting to continue with < 3 */}
        {alertNotice && (
          <div className="artist-alert-banner">
            <span>{alertNotice}</span>
          </div>
        )}

        {/* Responsive Desktop Artist Bubbles Grid */}
        <div className="artist-desktop-grid">
          {filteredArtists.length === 0 ? (
            <div className="no-artists-found">
              <p>No artists found matching "{searchQuery}"</p>
              <span>Try searching a different artist name</span>
            </div>
          ) : (
            filteredArtists.map((artist) => {
              const isSelected = selectedArtistIds.has(artist.id);
              return (
                <div
                  key={artist.id}
                  className={`artist-desktop-bubble ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleToggleArtist(artist.id)}
                  title={`${artist.name} (${artist.genre || 'Popular'})`}
                >
                  <div className="bubble-mask-container">
                    {/* Flower mask clip-path */}
                    <div
                      className="bubble-mask-frame"
                      style={{ clipPath: 'url(#flower-mask-artist)' }}
                    >
                      <img
                        src={artist.photo}
                        alt={artist.name}
                        className="artist-portrait-img"
                        loading="lazy"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                    </div>

                    {/* Animated Checkmark Badge */}
                    <div className="artist-check-badge">
                      <Check size={16} strokeWidth={3} />
                    </div>
                  </div>

                  <span className="artist-display-name">{artist.name}</span>
                  <span className="artist-genre-tag">{artist.genre || 'Worldwide'}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom prompt after all artists (e.g. after Coldplay) */}
        {!searchQuery.trim() && (
          <div className="artist-search-more-prompt">
            <p>
              Looking for more?{' '}
              <button
                type="button"
                className="link-search-trigger"
                onClick={handleScrollToSearch}
              >
                Search
              </button>{' '}
              for more artists worldwide on Spotify & YouTube
            </p>
          </div>
        )}
      </main>

      {/* Floating Bottom Action Dock for Desktop */}
      <footer className="artist-bottom-dock">
        <div className="dock-inner">
          <div className="dock-status-info">
            <span className={`dock-count-indicator ${isReady ? 'ready' : ''}`}>
              {isReady
                ? `${selectedCount} artists selected ✓ Ready to launch`
                : selectedCount === 0
                ? 'Select at least 3 artists (0/3)'
                : `Select ${remaining} more artist${remaining === 1 ? '' : 's'} (${selectedCount}/3)`}
            </span>
            <span className="dock-subtext">Click any artist portrait to add or remove</span>
          </div>

          <button
            type="button"
            className={`btn-dock-action ${isReady ? 'ready' : ''}`}
            disabled={!isReady}
            onClick={handleContinue}
          >
            <span>{isReady ? 'Continue & Set Up Vault' : `Select ${remaining} More`}</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
