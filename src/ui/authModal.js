// Enterprise Auth Modal Sheet (Firebase Auth + 2-Step OTP Email Verification + Google Login)
import { Icons } from './icons.js';
import { authService } from '../services/authService.js';
import { networkService } from '../services/networkService.js';

export function renderAuthModal(container, { onAuthSuccess }) {
  let mode = 'signup'; // 'signup' | 'login' | 'otp'
  let pendingEmail = '';
  let isLoading = false;
  let errorMessage = '';

  function render() {
    container.innerHTML = `
      <div class="auth-modal-sheet" id="auth-modal-sheet">
        <div class="auth-modal-card">
          <!-- Header -->
          <div class="auth-modal-header">
            <div>
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-secondary);">
                ${mode === 'otp' ? 'Step 2 of 2: Security Verification' : 'Cloud Membership'}
              </span>
              <h3 class="auth-modal-title" id="auth-title">
                ${mode === 'otp' ? 'Verify Your Email' : mode === 'signup' ? 'Create Account' : 'Welcome Back'}
              </h3>
            </div>
            <button class="btn-circle-nav" id="btn-close-auth" title="Close">
              ${Icons.close(18)}
            </button>
          </div>

          <p style="font-size: 13.5px; color: var(--text-secondary); margin-top: -6px;" id="auth-desc">
            ${mode === 'otp'
              ? `We sent a 6-digit code to <strong>${pendingEmail}</strong>. Enter it below to activate your account.`
              : mode === 'signup'
              ? 'Sign up with 2-step email verification to sync your sound universe.'
              : 'Log in to continue listening to your personalized music stream.'}
          </p>

          <!-- Error Alert Banner -->
          ${errorMessage ? `
            <div style="background: rgba(229, 57, 53, 0.08); border: 1px solid rgba(229, 57, 53, 0.25); border-radius: 14px; padding: 10px 14px; font-size: 13px; color: #D32F2F; display: flex; align-items: center; gap: 8px;">
              ${Icons.close(14)}
              <span>${errorMessage}</span>
            </div>
          ` : ''}

          <!-- Google One-Tap Sign In (Available on signup/login) -->
          ${mode !== 'otp' ? `
            <button class="btn-google-auth" id="btn-auth-google" type="button">
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <div style="display: flex; align-items: center; gap: 10px; margin: 4px 0;">
              <div style="flex: 1; height: 1px; background: var(--border-subtle);"></div>
              <span style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">or email</span>
              <div style="flex: 1; height: 1px; background: var(--border-subtle);"></div>
            </div>
          ` : ''}

          <!-- Form: Sign Up / Log In / OTP -->
          <form id="auth-main-form" class="auth-form-inputs">
            ${mode === 'signup' ? `
              <input type="text" class="input-field" id="auth-name-input" placeholder="Your Name" required />
              <input type="email" class="input-field" id="auth-email-input" placeholder="Email Address" required />
              <input type="password" class="input-field" id="auth-pass-input" placeholder="Password (min 6 characters)" minlength="6" required />
              <button type="submit" class="btn-black-pill" id="btn-auth-action" ${isLoading ? 'disabled' : ''}>
                ${isLoading ? 'Sending verification code...' : 'Continue with Email'}
              </button>
            ` : mode === 'login' ? `
              <input type="email" class="input-field" id="auth-email-input" placeholder="Email Address" required />
              <input type="password" class="input-field" id="auth-pass-input" placeholder="Password" required />
              <button type="submit" class="btn-black-pill" id="btn-auth-action" ${isLoading ? 'disabled' : ''}>
                ${isLoading ? 'Logging in...' : 'Log In'}
              </button>
            ` : `
              <!-- OTP Input Step -->
              <div style="display: flex; flex-direction: column; gap: 10px;">
                <input type="text" class="input-field" id="auth-otp-input" placeholder="000000" maxlength="6" 
                       style="text-align: center; font-size: 26px; font-weight: 800; letter-spacing: 8px; font-family: monospace;" required autofocus />
                <button type="submit" class="btn-black-pill" id="btn-auth-action" ${isLoading ? 'disabled' : ''}>
                  ${isLoading ? 'Verifying...' : 'Verify & Create Account'}
                </button>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                  <button type="button" class="login-text-link" id="btn-otp-resend">Resend Code</button>
                  <button type="button" class="login-text-link" id="btn-otp-back">Change Email</button>
                </div>
              </div>
            `}
          </form>

          <!-- Bottom Footer Navigation -->
          <div style="text-align: center; display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">
            ${mode !== 'otp' ? `
              <button class="login-text-link" id="btn-toggle-mode">
                ${mode === 'signup' ? 'Already have an account? <strong>Log In</strong>' : "Don't have an account? <strong>Sign Up</strong>"}
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    const sheet = container.querySelector('#auth-modal-sheet');

    // Close
    container.querySelector('#btn-close-auth')?.addEventListener('click', () => {
      sheet?.classList.remove('open');
    });

    sheet?.addEventListener('click', (e) => {
      if (e.target === sheet) sheet.classList.remove('open');
    });

    // Toggle Sign Up / Log In
    container.querySelector('#btn-toggle-mode')?.addEventListener('click', () => {
      mode = mode === 'signup' ? 'login' : 'signup';
      errorMessage = '';
      render();
      sheet?.classList.add('open');
    });

    // Google Sign-In
    container.querySelector('#btn-auth-google')?.addEventListener('click', async () => {
      if (!networkService.isOnline && !navigator.onLine) {
        errorMessage = 'Internet connection required. Please connect to Wi-Fi to sign in with Google.';
        render();
        sheet?.classList.add('open');
        return;
      }

      try {
        isLoading = true;
        errorMessage = '';
        render();
        sheet?.classList.add('open');

        const profile = await authService.signInWithGoogle();
        isLoading = false;
        sheet?.classList.remove('open');
        if (onAuthSuccess) onAuthSuccess(profile);
      } catch (err) {
        isLoading = false;
        errorMessage = err.message || 'Google Sign-In failed. Please try again.';
        render();
        sheet?.classList.add('open');
      }
    });

    // Main Form Submit
    container.querySelector('#auth-main-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!networkService.isOnline && !navigator.onLine) {
        errorMessage = 'Internet connection required. Please connect to Wi-Fi to continue.';
        render();
        sheet?.classList.add('open');
        return;
      }

      if (mode === 'signup') {
        const name = container.querySelector('#auth-name-input')?.value.trim();
        const email = container.querySelector('#auth-email-input')?.value.trim();
        const pass = container.querySelector('#auth-pass-input')?.value;

        if (!email || !pass) return;

        try {
          isLoading = true;
          errorMessage = '';
          pendingEmail = email;
          render();
          sheet?.classList.add('open');

          // Send 2-step verification OTP to user's email via Gmail transporter
          const res = await authService.initiateSignUpWithOtp(name, email, pass);
          isLoading = false;
          mode = 'otp';
          render();
          sheet?.classList.add('open');
        } catch (err) {
          isLoading = false;
          errorMessage = err.message || 'Failed to send verification code. Please check your email.';
          render();
          sheet?.classList.add('open');
        }
      } else if (mode === 'otp') {
        const otpCode = container.querySelector('#auth-otp-input')?.value.trim();
        if (!otpCode || otpCode.length !== 6) {
          errorMessage = 'Please enter a valid 6-digit verification code.';
          render();
          sheet?.classList.add('open');
          return;
        }

        try {
          isLoading = true;
          errorMessage = '';
          render();
          sheet?.classList.add('open');

          const profile = await authService.verifyOtpAndCreateAccount(otpCode);
          isLoading = false;
          sheet?.classList.remove('open');
          if (onAuthSuccess) onAuthSuccess(profile);
        } catch (err) {
          isLoading = false;
          errorMessage = err.message || 'Invalid or expired code. Please try again.';
          render();
          sheet?.classList.add('open');
        }
      } else if (mode === 'login') {
        const email = container.querySelector('#auth-email-input')?.value.trim();
        const pass = container.querySelector('#auth-pass-input')?.value;

        try {
          isLoading = true;
          errorMessage = '';
          render();
          sheet?.classList.add('open');

          const profile = await authService.logIn(email, pass);
          isLoading = false;
          sheet?.classList.remove('open');
          if (onAuthSuccess) onAuthSuccess(profile);
        } catch (err) {
          isLoading = false;
          errorMessage = 'Invalid email or password. Please try again.';
          render();
          sheet?.classList.add('open');
        }
      }
    });

    // OTP Resend
    container.querySelector('#btn-otp-resend')?.addEventListener('click', async () => {
      if (!authService.pendingOtp) return;
      try {
        const { name, email, password } = authService.pendingOtp;
        await authService.initiateSignUpWithOtp(name, email, password);
        alert(`New verification code sent to ${email}`);
      } catch (err) {
        alert('Failed to resend code: ' + err.message);
      }
    });

    // OTP Back / Change Email
    container.querySelector('#btn-otp-back')?.addEventListener('click', () => {
      mode = 'signup';
      errorMessage = '';
      render();
      sheet?.classList.add('open');
    });
  }

  // Initial render
  render();

  return {
    open(initialMode = 'signup') {
      mode = initialMode;
      errorMessage = '';
      render();
      const sheet = container.querySelector('#auth-modal-sheet');
      sheet?.classList.add('open');
    },
    close() {
      const sheet = container.querySelector('#auth-modal-sheet');
      sheet?.classList.remove('open');
    },
    isOpen() {
      const sheet = container.querySelector('#auth-modal-sheet');
      return !!sheet?.classList.contains('open');
    }
  };
}
