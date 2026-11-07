import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Search,
  Check,
  Sparkles,
  Loader2,
  Plus,
  Minus,
  AlertCircle,
  Users
} from 'lucide-react';
import { artistService } from '../services/artistService';
import { playerStore } from '../services/playerStore';

export function ManageArtistsModal({
  isOpen,
  onClose,
  currentArtists = [],
  onSave,
  onPausePlayback,
  isSaving = false
}) {
  const MIN_ARTISTS = 3;

  // Master catalog of artists (starts with curated artists + any user selected artists)
  const [allArtists, setAllArtists] = useState(() => {
    const curated = artistService.getCuratedArtists() || [];
    const curatedIds = new Set(curated.map((a) => (a.id || a.name).toLowerCase()));
    const extraCurrent = (currentArtists || []).filter(
      (a) => !curatedIds.has((a.id || a.name).toLowerCase())
    );
    return [...curated, ...extraCurrent];
  });

  // Selected artists map: key (lowercase ID or name) -> artist object
  const [selectedMap, setSelectedMap] = useState(() => new Map());

  // Initial snapshot to track added vs removed
  const [initialMap, setInitialMap] = useState(() => new Map());
  const [initialIds, setInitialIds] = useState(() => new Set());

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'selected' | 'added' | 'removed'
  const [alertNotice, setAlertNotice] = useState('');

  // Deliberate 5-7s setup loading state
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupStepText, setSetupStepText] = useState('Syncing your Sonic Taste DNA...');
  const [setupProgress, setSetupProgress] = useState(15);

  const prevIsOpenRef = useRef(false);
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);

  // Sync state ONLY when modal transitions from closed to open
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      const initMap = new Map();
      const initSet = new Set();
      const normalizedCurrent = (currentArtists || []).map((art) => {
        if (typeof art === 'string') {
          return {
            id: art.toLowerCase().replace(/\s+/g, '-'),
            name: art,
            genre: 'Artist',
            photo: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
            topSongs: []
          };
        }
        return art;
      });

      normalizedCurrent.forEach((art) => {
        const key = (art.id || art.name).toLowerCase();
        initMap.set(key, art);
        initSet.add(key);
      });

      setInitialMap(new Map(initMap));
      setInitialIds(new Set(initSet));
      setSelectedMap(new Map(initMap));

      // Ensure all current artists exist in master catalog
      setAllArtists((prev) => {
        const existing = new Set(prev.map((a) => (a.id || a.name).toLowerCase()));
        const missing = normalizedCurrent.filter((a) => !existing.has((a.id || a.name).toLowerCase()));
        return missing.length > 0 ? [...prev, ...missing] : prev;
      });

      setSearchQuery('');
      setActiveFilter('all');
      setAlertNotice('');
      setIsSettingUp(false);
      setSetupProgress(15);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Handle escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSaving && !isSettingUp) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, isSettingUp, onClose]);

  // Debounced worldwide artist search
  useEffect(() => {
    if (!isOpen || isSettingUp) return;
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
        console.warn('Artist search error in modal:', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(searchTimeoutRef.current);
  }, [searchQuery, isOpen, isSettingUp]);

  // Calculations for Added, Removed, and Selected
  const { addedArtists, removedArtists, isAdded, isRemoved } = useMemo(() => {
    const currentKeys = new Set(selectedMap.keys());

    // Added: in current selectedMap, but was NOT in initialIds
    const added = Array.from(selectedMap.values()).filter((art) => {
      const key = (art.id || art.name).toLowerCase();
      return !initialIds.has(key);
    });

    // Removed: was in initialIds, but is NOT in current selectedMap
    const removed = Array.from(initialMap.values()).filter((art) => {
      const key = (art.id || art.name).toLowerCase();
      return !currentKeys.has(key);
    });

    return {
      addedArtists: added,
      removedArtists: removed,
      isAdded: (art) => {
        const key = (art.id || art.name).toLowerCase();
        return selectedMap.has(key) && !initialIds.has(key);
      },
      isRemoved: (art) => {
        const key = (art.id || art.name).toLowerCase();
        return !selectedMap.has(key) && initialIds.has(key);
      }
    };
  }, [selectedMap, initialIds, initialMap]);

  const totalSelected = selectedMap.size;
  const addedCount = addedArtists.length;
  const removedCount = removedArtists.length;
  const hasChanges = addedCount > 0 || removedCount > 0;
  const isMinimumMet = totalSelected >= MIN_ARTISTS;
  const canSave = hasChanges && isMinimumMet && !isSaving && !isSettingUp;

  // Toggle selection for an artist
  const handleToggleArtist = (artist) => {
    const key = (artist.id || artist.name).toLowerCase();
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, artist);
      }
      return next;
    });
    setAlertNotice('');
  };

  // Restore a removed artist back into selection
  const handleRestoreArtist = (artist) => {
    const key = (artist.id || artist.name).toLowerCase();
    setSelectedMap((prev) => {
      const next = new Map(prev);
      next.set(key, artist);
      return next;
    });
  };

  // Filter the list based on active tab and search query
  const displayedArtists = useMemo(() => {
    let sourceList = [];

    if (activeFilter === 'added') {
      sourceList = addedArtists;
    } else if (activeFilter === 'removed') {
      sourceList = removedArtists;
    } else if (activeFilter === 'selected') {
      sourceList = Array.from(selectedMap.values());
    } else {
      sourceList = allArtists;
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return sourceList;

    return sourceList.filter((art) => {
      const nameMatch = art.name && art.name.toLowerCase().includes(q);
      const genreMatch = art.genre && art.genre.toLowerCase().includes(q);
      return nameMatch || genreMatch;
    });
  }, [activeFilter, allArtists, addedArtists, removedArtists, selectedMap, searchQuery]);

  // Handle Confirm Save: Deliberate 5-7s loading & pause active track if playing
  const handleConfirmSave = async () => {
    if (!isMinimumMet) {
      setAlertNotice(`Please choose at least ${MIN_ARTISTS} artists to curate your Sonic DNA.`);
      return;
    }
    if (!hasChanges) {
      return;
    }

    // 1. If audio is playing, simply pause it so user can play from where it was after
    if (onPausePlayback) {
      try {
        onPausePlayback();
      } catch (e) {
        console.warn('Playback pause notice:', e);
      }
    }

    // 2. Deliberate setup state for a random 5 to 7 seconds
    setIsSettingUp(true);
    setSetupProgress(15);
    setSetupStepText('Harmonizing your Sonic Taste DNA...');

    const duration = Math.floor(Math.random() * 2000) + 5000; // 5000ms - 7000ms randomly
    const startTime = Date.now();

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(94, Math.round((elapsed / duration) * 100));
      setSetupProgress(pct);

      if (pct > 72) {
        setSetupStepText('Curating personalized mixes & dynamic spotlight...');
      } else if (pct > 38) {
        setSetupStepText('Syncing fresh Top Songs & Video Hits...');
      }
    }, 120);

    const updatedList = Array.from(selectedMap.values());

    try {
      // Run background save in parallel with deliberate 5-7s timer
      await Promise.all([
        onSave ? onSave(updatedList, addedArtists) : Promise.resolve(),
        new Promise((resolve) => setTimeout(resolve, duration))
      ]);

      setSetupProgress(100);
      setSetupStepText('Your Vault is Ready!');
      await new Promise((resolve) => setTimeout(resolve, 450));
    } catch (err) {
      console.error('Setup error in modal:', err);
    } finally {
      clearInterval(progressInterval);
      setIsSettingUp(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="playlist-modal-backdrop manage-artists-overlay"
      onClick={() => {
        if (!isSaving && !isSettingUp) onClose();
      }}
    >
      <div
        className={`playlist-modal-card manage-artists-card ceramic-modal ${isSettingUp ? 'is-loading-card' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {isSettingUp ? (
          /* ================================================================
             Deliberate 5-7s Setup Loading Card
             ================================================================ */
          <div className="manage-artists-setting-up-card">
            <div className="setting-up-spinner-container">
              <div
                className="setting-up-flower-badge"
                style={{ clipPath: 'url(#flower-mask-artist)' }}
              >
                <div className="setting-up-flower-inner">
                  <Sparkles size={42} className="setting-up-sparkle-icon" />
                </div>
              </div>
            </div>
            <h3 className="setting-up-title">Setting Up Your Personalized Vault...</h3>
            <p className="setting-up-subtitle">{setupStepText}</p>
            <div className="setting-up-progress-wrap">
              <div className="setting-up-progress-bar">
                <div
                  className="setting-up-progress-fill"
                  style={{ width: `${setupProgress}%` }}
                />
              </div>
              <span className="setting-up-progress-label">{Math.round(setupProgress)}%</span>
            </div>
          </div>
        ) : (
          /* ================================================================
             Main Artist Management Interface
             ================================================================ */
          <>
            {/* Modal Header */}
            <div className="manage-artists-header">
              <div className="manage-artists-header-info">
                <div className="modal-title-cluster">
                  <span className="modal-eyebrow">Personalization Engine</span>
                  <h2 className="modal-title">Update Selected Artists</h2>
                </div>
                <p className="manage-artists-subtitle">
                  Add or remove artists to dynamically retrain your Quick Picks, Top Songs, and Video Hits.
                </p>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={onClose}
                disabled={isSaving}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Bar + Dynamic Change Filter Tags */}
            <div className="manage-artists-controls-bar">
              <div className="manage-artists-search-wrap">
                <Search size={16} className="search-input-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="manage-artists-search-input"
                  placeholder="Search catalog or discover worldwide artists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={isSaving}
                />
                {isSearching && <Loader2 size={16} className="search-spinner spin" />}
                {searchQuery && (
                  <button
                    type="button"
                    className="btn-clear-search"
                    onClick={() => setSearchQuery('')}
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Interactive Filter Pills */}
              <div className="manage-artists-filter-pills">
                <button
                  type="button"
                  className={`artist-filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('all')}
                >
                  <Users size={12} />
                  <span>All ({allArtists.length})</span>
                </button>

                <button
                  type="button"
                  className={`artist-filter-pill ${activeFilter === 'selected' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('selected')}
                >
                  <Check size={12} />
                  <span>Selected ({totalSelected})</span>
                </button>

                <button
                  type="button"
                  className={`artist-filter-pill pill-added ${activeFilter === 'added' ? 'active' : ''} ${addedCount > 0 ? 'has-count' : ''}`}
                  onClick={() => setActiveFilter('added')}
                  title={addedCount > 0 ? `View ${addedCount} newly added artists` : 'No artists added yet'}
                >
                  <Plus size={12} />
                  <span>+ Added ({addedCount})</span>
                </button>

                <button
                  type="button"
                  className={`artist-filter-pill pill-removed ${activeFilter === 'removed' ? 'active' : ''} ${removedCount > 0 ? 'has-count' : ''}`}
                  onClick={() => setActiveFilter('removed')}
                  title={removedCount > 0 ? `View ${removedCount} removed artists (click to restore)` : 'No artists removed yet'}
                >
                  <Minus size={12} />
                  <span>- Removed ({removedCount})</span>
                </button>
              </div>
            </div>

            {/* Alert Banner if below minimum */}
            {alertNotice && (
              <div className="manage-artists-alert-banner">
                <AlertCircle size={15} />
                <span>{alertNotice}</span>
              </div>
            )}

            {/* Filter Explanation Notice for Added or Removed views */}
            {activeFilter === 'added' && (
              <div className="filter-context-banner banner-added">
                <Plus size={14} />
                <span>
                  Showing <strong>{addedCount}</strong> newly added {addedCount === 1 ? 'artist' : 'artists'}. Click any to un-add.
                </span>
              </div>
            )}
            {activeFilter === 'removed' && (
              <div className="filter-context-banner banner-removed">
                <Minus size={14} />
                <span>
                  Showing <strong>{removedCount}</strong> removed {removedCount === 1 ? 'artist' : 'artists'}. Click any to restore them.
                </span>
              </div>
            )}

            {/* Scrollable Artists Grid */}
            <div className="manage-artists-grid-container">
              {displayedArtists.length === 0 ? (
                <div className="manage-artists-empty">
                  {activeFilter === 'added' ? (
                    <>
                      <p>No artists have been added yet in this session.</p>
                      <span>Select any artist from the "All" tab to add them.</span>
                    </>
                  ) : activeFilter === 'removed' ? (
                    <>
                      <p>No artists have been removed in this session.</p>
                      <span>Deselecting an artist will track them here for easy restoration.</span>
                    </>
                  ) : (
                    <>
                      <p>No artists found matching "{searchQuery}"</p>
                      <span>Try a different name or search worldwide</span>
                    </>
                  )}
                </div>
              ) : (
                <div className="manage-artists-grid">
                  {displayedArtists.map((artist) => {
                    const key = (artist.id || artist.name).toLowerCase();
                    const isSelected = selectedMap.has(key);
                    const isNewlyAdded = isAdded(artist);
                    const isNewlyRemoved = isRemoved(artist);

                    return (
                      <div
                        key={artist.id || artist.name}
                        className={`manage-artist-card ${isSelected ? 'selected' : ''} ${isNewlyRemoved ? 'was-removed' : ''}`}
                        onClick={() => {
                          if (activeFilter === 'removed' && isNewlyRemoved) {
                            handleRestoreArtist(artist);
                          } else {
                            handleToggleArtist(artist);
                          }
                        }}
                        title={
                          isNewlyRemoved
                            ? `Click to restore ${artist.name}`
                            : isSelected
                            ? `Click to remove ${artist.name}`
                            : `Click to select ${artist.name}`
                        }
                      >
                        {/* Starlike Wavy Avatar Shape matching setup */}
                        <div className="manage-artist-avatar-wrap">
                          <div
                            className="bubble-mask-frame"
                            style={{ clipPath: 'url(#flower-mask-artist)' }}
                          >
                            <img
                              src={artist.photo || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80'}
                              alt={artist.name}
                              className="artist-portrait-img"
                              loading="lazy"
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80';
                              }}
                            />
                          </div>

                          <div className="manage-artist-check-badge">
                            <Check size={14} strokeWidth={2.5} />
                          </div>

                          {isNewlyRemoved && (
                            <div className="manage-artist-removed-badge" title="Removed from selection">
                              <Minus size={13} strokeWidth={2.5} />
                            </div>
                          )}
                        </div>

                        <div className="manage-artist-meta">
                          <span className="manage-artist-name">{artist.name}</span>
                          <span className="manage-artist-genre">{artist.genre || 'Popular'}</span>
                        </div>

                        {/* Change Indicators */}
                        {isNewlyAdded && (
                          <span className="artist-change-badge badge-added">+ Added</span>
                        )}
                        {isNewlyRemoved && (
                          <span className="artist-change-badge badge-removed">- Removed</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="manage-artists-footer">
              <div className="manage-artists-status-info">
                {!isMinimumMet ? (
                  <span className="status-warning">
                    ⚠️ Choose at least {MIN_ARTISTS} artists ({MIN_ARTISTS - totalSelected} more required)
                  </span>
                ) : hasChanges ? (
                  <span className="status-changes">
                    ✨ <strong>{addedCount}</strong> added, <strong>{removedCount}</strong> removed • {totalSelected} total selected
                  </span>
                ) : (
                  <span className="status-unchanged">
                    No changes made • {totalSelected} artists currently active
                  </span>
                )}
              </div>

              <div className="manage-artists-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={onClose}
                  disabled={isSaving}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className={`btn-modal-update-artists ${canSave ? 'active' : ''}`}
                  disabled={!canSave}
                  onClick={handleConfirmSave}
                  title={
                    !hasChanges
                      ? 'No changes have been made to your artist selection'
                      : !isMinimumMet
                      ? `Select at least ${MIN_ARTISTS} artists`
                      : 'Save your updated Sonic Taste DNA'
                  }
                >
                  <Sparkles size={15} />
                  <span>Update Artists</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
