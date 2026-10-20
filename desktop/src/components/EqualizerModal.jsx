import React, { useState } from 'react';
import { X, Sliders, Volume2, Sparkles, Check } from 'lucide-react';

export function EqualizerModal({ isOpen, onClose }) {
  const [preset, setPreset] = useState('Studio Master');
  const [bands, setBands] = useState({
    bass: 4,
    lowMid: 2,
    mid: 0,
    highMid: 3,
    treble: 5
  });
  const [spatializerEnabled, setSpatializerEnabled] = useState(true);

  if (!isOpen) return null;

  const presets = [
    { name: 'Studio Master', values: { bass: 4, lowMid: 2, mid: 0, highMid: 3, treble: 5 } },
    { name: 'Bass Boost', values: { bass: 8, lowMid: 5, mid: 1, highMid: 0, treble: 2 } },
    { name: 'Vocal Clarity', values: { bass: 1, lowMid: 3, mid: 6, highMid: 5, treble: 4 } },
    { name: 'Acoustic Warmth', values: { bass: 3, lowMid: 4, mid: 2, highMid: 4, treble: 3 } },
    { name: 'Flat Reference', values: { bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0 } }
  ];

  const handlePresetSelect = (p) => {
    setPreset(p.name);
    setBands(p.values);
  };

  const handleBandChange = (key, value) => {
    setBands((prev) => ({ ...prev, [key]: Number(value) }));
    setPreset('Custom');
  };

  return (
    <div className="equalizer-modal-backdrop" onClick={onClose}>
      <div className="equalizer-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="eq-modal-header">
          <div className="eq-title-group">
            <span className="eq-eyebrow">Audio Engine</span>
            <h3 className="eq-title">Acoustic Equalizer & Master Tuner</h3>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Spatializer Capsule */}
        <div className="eq-spatial-toggle-row">
          <div className="eq-spatial-text">
            <span className="spatial-label">3D Ceramic Spatializer</span>
            <span className="spatial-sub">Expands soundstage across desktop speakers/headphones</span>
          </div>
          <label className="switch-toggle">
            <input
              type="checkbox"
              checked={spatializerEnabled}
              onChange={(e) => setSpatializerEnabled(e.target.checked)}
            />
            <span className="slider round" />
          </label>
        </div>

        {/* Presets Row */}
        <div className="eq-presets-row">
          {presets.map((p) => (
            <button
              key={p.name}
              type="button"
              className={`preset-pill ${preset === p.name ? 'active' : ''}`}
              onClick={() => handlePresetSelect(p)}
            >
              {preset === p.name && <Check size={12} strokeWidth={3} />}
              <span>{p.name}</span>
            </button>
          ))}
        </div>

        {/* 5-Band Vertical Sliders */}
        <div className="eq-sliders-board">
          {[
            { key: 'bass', label: '60 Hz', title: 'Sub Bass' },
            { key: 'lowMid', label: '250 Hz', title: 'Bass' },
            { key: 'mid', label: '1 kHz', title: 'Mids' },
            { key: 'highMid', label: '4 kHz', title: 'Highs' },
            { key: 'treble', label: '16 kHz', title: 'Air' }
          ].map((band) => (
            <div key={band.key} className="eq-slider-col">
              <span className="eq-val-badge">
                {bands[band.key] > 0 ? `+${bands[band.key]}` : bands[band.key]}dB
              </span>
              <div className="eq-slider-track-wrap">
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={bands[band.key]}
                  onChange={(e) => handleBandChange(band.key, e.target.value)}
                  className="eq-vertical-range"
                />
              </div>
              <span className="eq-hz-label">{band.label}</span>
              <span className="eq-band-title">{band.title}</span>
            </div>
          ))}
        </div>

        <div className="eq-modal-footer">
          <span className="eq-status-indicator">
            <Sparkles size={14} /> 64-Bit Float WebAudio Pipeline
          </span>
          <button type="button" className="btn-done-pill" onClick={onClose}>
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
}
