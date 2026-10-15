// Equalizer & Audio Settings Modal (Web Audio API 5-Band Graphic Equalizer)
import { Icons } from './icons.js';

export function renderEqualizerModal(container, { audioEngine }) {
  let activePreset = 'bass';
  const bandLabels = [
    { name: 'Sub Bass', freq: '60Hz' },
    { name: 'Bass', freq: '230Hz' },
    { name: 'Mid', freq: '910Hz' },
    { name: 'Presence', freq: '4kHz' },
    { name: 'Treble', freq: '14kHz' }
  ];

  const presets = {
    'bass': [7, 5, 1, 0, -1],
    'vocal': [-2, 1, 6, 4, 2],
    'flat': [0, 0, 0, 0, 0],
    'electronic': [5, 4, 0, 3, 5],
    'acoustic': [3, 2, 1, 3, 4],
    'rock': [5, 3, -1, 3, 6]
  };

  let currentGains = [...(presets[activePreset] || [0, 0, 0, 0, 0])];

  function render() {
    container.innerHTML = `
      <div class="equalizer-modal-sheet" id="equalizer-modal-sheet">
        <div class="equalizer-card">
          <div class="auth-modal-header">
            <div>
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-secondary); font-weight: 700;">Sound Studio</span>
              <h3 class="auth-modal-title">Audio & Equalizer</h3>
            </div>
            <button class="btn-circle-nav" id="btn-close-eq" title="Close">
              ${Icons.close(18)}
            </button>
          </div>

          <!-- Graphic EQ Presets -->
          <div>
            <label style="font-size: 13px; font-weight: 700; color: var(--text-primary);">Graphic EQ Presets</label>
            <div class="equalizer-presets-grid" id="eq-presets-grid">
              <button class="eq-preset-btn ${activePreset === 'bass' ? 'active' : ''}" data-preset="bass">Bass Boost</button>
              <button class="eq-preset-btn ${activePreset === 'vocal' ? 'active' : ''}" data-preset="vocal">Vocal Clarity</button>
              <button class="eq-preset-btn ${activePreset === 'flat' ? 'active' : ''}" data-preset="flat">Pure Flat</button>
              <button class="eq-preset-btn ${activePreset === 'electronic' ? 'active' : ''}" data-preset="electronic">Electronic</button>
              <button class="eq-preset-btn ${activePreset === 'acoustic' ? 'active' : ''}" data-preset="acoustic">Acoustic</button>
              <button class="eq-preset-btn ${activePreset === 'rock' ? 'active' : ''}" data-preset="rock">Rock Club</button>
            </div>
          </div>

          <!-- Real 5-Band Equalizer Sliders -->
          <div style="background: var(--bg-surface); border-radius: 20px; border: 1px solid var(--border-subtle); padding: 14px 16px; display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 12px; font-weight: 700; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.5px;">5-Band Hardware Studio</span>
              <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">-12dB to +12dB</span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; text-align: center;">
              ${bandLabels.map((b, i) => `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
                  <span id="gain-label-${i}" style="font-size: 11px; font-weight: 800; color: var(--accent-black);">${currentGains[i] > 0 ? `+${currentGains[i]}` : currentGains[i]}dB</span>
                  <input type="range" class="eq-band-slider" data-band="${i}" min="-12" max="12" step="1" value="${currentGains[i]}" 
                         style="writing-mode: vertical-lr; direction: rtl; width: 24px; height: 90px; accent-color: var(--accent-black); cursor: pointer;" />
                  <span style="font-size: 10px; font-weight: 700; color: var(--text-secondary); margin-top: 2px;">${b.freq}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Hi-Fi Toggle -->
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--bg-surface); border-radius: 18px; border: 1px solid var(--border-subtle);">
            <div>
              <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">Lossless 320kbps Hi-Fi Audio</div>
              <div style="font-size: 11px; color: var(--text-secondary);">Direct studio dynamic range playback</div>
            </div>
            <input type="checkbox" id="toggle-hifi" checked style="width: 18px; height: 18px; accent-color: var(--accent-black); cursor: pointer;" />
          </div>

          <button class="btn-black-pill" id="btn-apply-eq" style="margin-top: 2px;">
            Apply Equalizer
          </button>
        </div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    const sheet = container.querySelector('#equalizer-modal-sheet');
    const closeBtn = container.querySelector('#btn-close-eq');
    const applyBtn = container.querySelector('#btn-apply-eq');
    const presetButtons = container.querySelectorAll('.eq-preset-btn');
    const sliders = container.querySelectorAll('.eq-band-slider');

    // Preset selection
    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        presetButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activePreset = btn.dataset.preset;
        currentGains = [...(presets[activePreset] || [0, 0, 0, 0, 0])];

        if (audioEngine) {
          audioEngine.setEqualizerPreset(activePreset);
        }

        // Update slider values and labels
        sliders.forEach((slider, i) => {
          slider.value = currentGains[i];
          const label = container.querySelector(`#gain-label-${i}`);
          if (label) {
            label.textContent = `${currentGains[i] > 0 ? `+${currentGains[i]}` : currentGains[i]}dB`;
          }
        });
      });
    });

    // Custom slider adjustments
    sliders.forEach(slider => {
      slider.addEventListener('input', () => {
        const bandIndex = parseInt(slider.dataset.band, 10);
        const val = parseInt(slider.value, 10);
        currentGains[bandIndex] = val;

        const label = container.querySelector(`#gain-label-${bandIndex}`);
        if (label) {
          label.textContent = `${val > 0 ? `+${val}` : val}dB`;
        }

        if (audioEngine) {
          audioEngine.setEqualizerBandGain(bandIndex, val);
        }
      });
    });

    closeBtn?.addEventListener('click', () => sheet?.classList.remove('open'));
    applyBtn?.addEventListener('click', () => sheet?.classList.remove('open'));
    sheet?.addEventListener('click', (e) => {
      if (e.target === sheet) sheet.classList.remove('open');
    });
  }

  // Initial render
  render();

  return {
    open() {
      const sheet = container.querySelector('#equalizer-modal-sheet');
      sheet?.classList.add('open');
      if (audioEngine) {
        audioEngine.setEqualizerPreset(activePreset);
      }
    },
    close() {
      const sheet = container.querySelector('#equalizer-modal-sheet');
      sheet?.classList.remove('open');
    },
    isOpen() {
      const sheet = container.querySelector('#equalizer-modal-sheet');
      return !!sheet?.classList.contains('open');
    }
  };
}
