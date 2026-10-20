import React from 'react';
import { Sparkles, CheckCircle2, RotateCcw, Music } from 'lucide-react';
import { CURATED_ARTISTS } from '../data/curatedArtists';

export function VaultReadyView({ selectedArtistIds, onReset, onBackToArtists }) {
  // Find names/photos of selected artists
  const artistDetails = selectedArtistIds.map((id) => {
    const found = CURATED_ARTISTS.find((a) => a.id === id);
    return found || { id, name: id.replace('artist-', ''), photo: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80' };
  });

  return (
    <div className="vault-ready-wrapper">
      <div className="vault-ready-card">
        <div className="vault-icon-badge">
          <Sparkles size={32} />
        </div>

        <span className="vault-eyebrow">Onboarding Complete</span>
        <h1 className="vault-title">Your Sonic Vault is Ready</h1>
        <p className="vault-desc">
          Your taste profile has been initialized with {selectedArtistIds.length} artists. When we build the Home Page & Player next, your mixes will be generated from this selection.
        </p>

        {/* Selected Artists Showcase */}
        <div className="vault-artists-preview">
          {artistDetails.slice(0, 8).map((artist) => (
            <div key={artist.id} className="vault-artist-item" title={artist.name}>
              <div
                className="vault-artist-mask"
                style={{ clipPath: 'url(#flower-mask-artist)' }}
              >
                <img src={artist.photo} alt={artist.name} />
              </div>
              <span className="vault-artist-name">{artist.name}</span>
            </div>
          ))}
          {artistDetails.length > 8 && (
            <div className="vault-more-pill">
              +{artistDetails.length - 8} more
            </div>
          )}
        </div>

        <div className="vault-actions-row">
          <button
            type="button"
            className="btn-vault-outline"
            onClick={onBackToArtists}
          >
            <Music size={16} />
            <span>Adjust Artist Taste</span>
          </button>

          <button
            type="button"
            className="btn-vault-reset"
            onClick={onReset}
          >
            <RotateCcw size={16} />
            <span>Test Auth / Onboarding Again</span>
          </button>
        </div>
      </div>
    </div>
  );
}
