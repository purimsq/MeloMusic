// Auth Modal Sheet (Sign Up & Log In)
import { Icons } from './icons.js';
import { Storage } from '../services/storage.js';

export function renderAuthModal(container, { onAuthSuccess, onSkip }) {
  container.innerHTML = `
    <div class="auth-modal-sheet" id="auth-modal-sheet">
      <div class="auth-modal-card">
        <div class="auth-modal-header">
          <h3 class="auth-modal-title" id="auth-title">Create Account</h3>
          <button class="btn-circle-nav" id="btn-close-auth" title="Close">
            ${Icons.close(18)}
          </button>
        </div>

        <p style="font-size: 13.5px; color: var(--text-secondary); margin-top: -8px;" id="auth-desc">
          Sign up to sync your favorite music & playlists across your devices.
        </p>

        <form id="auth-form" class="auth-form-inputs">
          <div id="auth-name-group">
            <input type="text" class="input-field" id="auth-name" placeholder="Your Name" />
          </div>
          <input type="email" class="input-field" id="auth-email" placeholder="Email Address" required />
          <input type="password" class="input-field" id="auth-password" placeholder="Password" required />

          <button type="submit" class="btn-black-pill" id="btn-auth-submit" style="margin-top: 6px;">
            Sign Up
          </button>
        </form>

        <div style="text-align: center; display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">
          <button class="login-text-link" id="btn-toggle-auth-mode">
            Already have an account? <strong>Log In</strong>
          </button>
          <button class="btn-skip" id="btn-auth-guest-skip" style="align-self: center;">
            Continue as Guest (Skip)
          </button>
        </div>
      </div>
    </div>
  `;

  const sheet = container.querySelector('#auth-modal-sheet');
  const title = container.querySelector('#auth-title');
  const desc = container.querySelector('#auth-desc');
  const nameGroup = container.querySelector('#auth-name-group');
  const submitBtn = container.querySelector('#btn-auth-submit');
  const toggleBtn = container.querySelector('#btn-toggle-auth-mode');
  const form = container.querySelector('#auth-form');

  let mode = 'signup'; // 'signup' | 'login'

  function updateMode(newMode) {
    mode = newMode;
    if (mode === 'signup') {
      title.textContent = 'Create Account';
      desc.textContent = 'Sign up to sync your favorite music & playlists across your devices.';
      nameGroup.style.display = 'block';
      submitBtn.textContent = 'Sign Up';
      toggleBtn.innerHTML = `Already have an account? <strong>Log In</strong>`;
    } else {
      title.textContent = 'Welcome Back';
      desc.textContent = 'Log in to continue listening to your personal music vault.';
      nameGroup.style.display = 'none';
      submitBtn.textContent = 'Log In';
      toggleBtn.innerHTML = `Don't have an account? <strong>Sign Up</strong>`;
    }
  }

  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    updateMode(mode === 'signup' ? 'login' : 'signup');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = container.querySelector('#auth-email').value.trim();
    const name = container.querySelector('#auth-name').value.trim() || email.split('@')[0];
    
    // Save user profile locally
    const profile = {
      name,
      email,
      isLoggedIn: true,
      createdAt: Date.now()
    };
    Storage.setUserProfile(profile);

    sheet.classList.remove('open');
    if (onAuthSuccess) onAuthSuccess(profile);
  });

  container.querySelector('#btn-close-auth').addEventListener('click', () => {
    sheet.classList.remove('open');
  });

  container.querySelector('#btn-auth-guest-skip').addEventListener('click', () => {
    sheet.classList.remove('open');
    if (onSkip) onSkip();
  });

  return {
    open(initialMode = 'signup') {
      updateMode(initialMode);
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
