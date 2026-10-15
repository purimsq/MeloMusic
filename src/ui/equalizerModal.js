// Equalizer & Audio Settings Modal
import { Icons } from './icons.js';

export function renderEqualizerModal(container) {
  let activePreset = 'bass'; // 'bass' | 'vocal' | 'flat' | 'electronic' | 'acoustic' | 'rock'
  let isHiFi = true;

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

        <!-- Audio Presets -->
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

        <!-- Audio Quality Toggle -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: var(--bg-surface); border-radius: 20px; border: 1px solid var(--border-subtle); margin-top: 4px;">
          <div>
            <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">Hi-Res 320kbps Stream</div>
            <div style="font-size: 12px; color: var(--text-secondary);">Lossless audio fidelity & wider dynamic range</div>
          </div>
          <input type="checkbox" id="toggle-hifi" checked style="width: 20px; height: 20px; accent-color: var(--accent-black); cursor: pointer;" />
        </div>

        <button class="btn-black-pill" id="btn-apply-eq" style="margin-top: 4px;">
          Save Audio Profile
        </button>
      </div>
    </div>
  `;

  const sheet = container.querySelector('#equalizer-modal-sheet');
  const closeBtn = container.querySelector('#btn-close-eq');
  const applyBtn = container.querySelector('#btn-apply-eq');
  const presetButtons = container.querySelectorAll('.eq-preset-btn');

  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      presetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activePreset = btn.dataset.preset;
    });
  });

  closeBtn.addEventListener('click', () => sheet.classList.remove('open'));
  applyBtn.addEventListener('click', () => sheet.classList.remove('open'));

  return {
    open() {
      sheet.classList.add('open');
    },
    close() {
      sheet.classList.remove('open');
    },
    isOpen() {
      return sheet.classList.contains('open');
    }
  };
}
