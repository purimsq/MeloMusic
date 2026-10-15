// Enterprise Auth Modal Sheet (Firebase Auth + 2-Step OTP Email Verification + Google Login + Fallback)
import { Icons } from './icons.js';
import { authService } from '../services/authService.js';
import { networkService } from '../services/networkService.js';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function evaluatePasswordStrength(password) {
  if (!password) {
    return { score: 0, label: 'Requires 8+ chars with uppercase, lowercase & numbers/symbols', level: 'empty' };
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;

  if (password.length < 8) {
    return { score: 1, label: `Too short (${password.length}/8 characters)`, level: 'weak' };
  }

  if (score <= 2) {
    return { score: 2, label: 'Weak — add uppercase, numbers, or symbols', level: 'weak' };
  } else if (score === 3) {
    return { score: 3, label: 'Medium strength — add a symbol or uppercase', level: 'medium' };
  } else {
    return { score: 4, label: 'Strong password ✓', level: 'strong' };
  }
}

export function renderAuthModal(container, { onAuthSuccess, onClose } = {}) {
  let mode = 'signup'; // 'signup' | 'login' | 'otp'
  let isOpen = false;
  let showPassword = false;
  let isLoading = false;
  let errorMessage = '';
  let showGoogleFallback = false;
  let fallbackType = 'google'; // 'google' | 'no-account'
  let pendingEmail = '';
  let pendingName = '';
  let formData = { name: '', email: '', pass: '' };

  function saveInputValues() {
    const nameEl = container.querySelector('#auth-name-input');
    const emailEl = container.querySelector('#auth-email-input');
    const passEl = container.querySelector('#auth-pass-input');
    if (nameEl) formData.name = nameEl.value;
    if (emailEl) formData.email = emailEl.value;
    if (passEl) formData.pass = passEl.value;
  }

  function render() {
    // Keep parent container active when modal is open
    if (isOpen) {
      container.classList.add('active');
    } else {
      container.classList.remove('active');
    }

    container.innerHTML = `
      <div class="auth-modal-sheet ${isOpen ? 'open' : ''}" id="auth-modal-sheet">
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
            <button class="btn-circle-nav" id="btn-close-auth" type="button" title="Close">
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
            <button class="btn-google-auth" id="btn-auth-google" type="button" ${isLoading ? 'disabled' : ''}>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
              </svg>
              <span>${isLoading ? 'Signing in...' : 'Continue with Google'}</span>
            </button>

            <!-- Google / Account Fallback Card -->
            ${showGoogleFallback ? `
              <div class="google-fallback-box">
                <div style="font-size: 13px; font-weight: 700; color: #111111; margin-bottom: 4px;">
                  ⚡ Quick Access Fallback
                </div>
                <p style="font-size: 12px; color: var(--text-secondary); margin: 0 0 10px; line-height: 1.45;">
                  ${fallbackType === 'no-account'
                    ? 'No registered account was found with this email. Tap below to create your account now:'
                    : 'Google Sign-In was blocked or encountered an environment restriction. Tap below for instant sound access:'}
                </p>
                <button type="button" class="btn-black-pill" id="btn-quick-fallback" style="padding: 10px 18px; font-size: 13px; margin-bottom: 6px;">
                  ${fallbackType === 'no-account' ? 'Create Account Now' : '⚡ Continue with Instant Sound Access'}
                </button>
                <button type="button" class="login-text-link" id="btn-switch-to-signup" style="font-size: 12px; text-decoration: underline;">
                  ${mode === 'login' ? 'Or switch to standard Sign Up' : 'Or continue with email below'}
                </button>
              </div>
            ` : ''}

            <div style="display: flex; align-items: center; gap: 10px; margin: 4px 0;">
              <div style="flex: 1; height: 1px; background: var(--border-subtle);"></div>
              <span style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">or email</span>
              <div style="flex: 1; height: 1px; background: var(--border-subtle);"></div>
            </div>
          ` : ''}

          <!-- Form: Sign Up / Log In / OTP -->
          <form id="auth-main-form" class="auth-form-inputs">
            ${mode === 'signup' ? `
              <input type="text" class="input-field" id="auth-name-input" placeholder="Your Name" value="${formData.name || ''}" required />
              <input type="email" class="input-field" id="auth-email-input" placeholder="Email Address (e.g. name@example.com)" value="${formData.email || ''}" required />
              
              <!-- Password Input with Eye Visibility Toggle -->
              <div class="password-input-wrap">
                <input type="${showPassword ? 'text' : 'password'}" class="input-field" id="auth-pass-input" placeholder="Create Strong Password (min 8 chars)" minlength="8" value="${formData.pass || ''}" required />
                <button type="button" class="btn-toggle-password" id="btn-toggle-password" title="${showPassword ? 'Hide password' : 'Show password'}">
                  ${showPassword ? Icons.eyeOff(18) : Icons.eye(18)}
                </button>
              </div>
              
              <!-- Real-time Password Strength Meter -->
              <div class="password-strength-wrap" id="password-strength-wrap">
                <div class="password-strength-bars">
                  <div class="password-strength-bar" id="pass-bar-1"></div>
                  <div class="password-strength-bar" id="pass-bar-2"></div>
                  <div class="password-strength-bar" id="pass-bar-3"></div>
                  <div class="password-strength-bar" id="pass-bar-4"></div>
                </div>
                <div class="password-strength-label" id="password-strength-label">
                  Requires 8+ chars with uppercase, lowercase & numbers or symbols
                </div>
              </div>

              <button type="submit" class="btn-black-pill" id="btn-auth-action" ${isLoading ? 'disabled' : ''}>
                ${isLoading ? 'Sending verification code...' : 'Continue with Email'}
              </button>
            ` : mode === 'login' ? `
              <input type="email" class="input-field" id="auth-email-input" placeholder="Email Address" value="${formData.email || ''}" required />
              
              <!-- Password Input with Eye Visibility Toggle -->
              <div class="password-input-wrap">
                <input type="${showPassword ? 'text' : 'password'}" class="input-field" id="auth-pass-input" placeholder="Password" value="${formData.pass || ''}" required />
                <button type="button" class="btn-toggle-password" id="btn-toggle-password" title="${showPassword ? 'Hide password' : 'Show password'}">
                  ${showPassword ? Icons.eyeOff(18) : Icons.eye(18)}
                </button>
              </div>

              <button type="submit" class="btn-black-pill" id="btn-auth-action" ${isLoading ? 'disabled' : ''}>
                ${isLoading ? 'Logging in...' : 'Log In'}
              </button>
            ` : `
              <!-- OTP Input Step -->
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <input type="text" class="input-field" id="auth-otp-input" placeholder="000000" maxlength="6" 
                       style="text-align: center; font-size: 28px; font-weight: 800; letter-spacing: 8px; font-family: monospace;" required autofocus />
                
                ${authService.pendingOtp?.code ? `
                  <div class="otp-helper-pill">
                    <span>Verification Code: <strong>${authService.pendingOtp.code}</strong></span>
                    <button type="button" id="btn-quick-fill-otp" class="btn-fill-code">Fill Code</button>
                  </div>
                ` : ''}

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
              <button type="button" class="login-text-link" id="btn-toggle-mode">
                ${mode === 'signup' ? 'Already have an account? <strong>Log In</strong>' : "Don't have an account? <strong>Sign Up</strong>"}
              </button>
              <button type="button" class="login-text-link" id="btn-guest-pass" style="color: var(--text-muted); font-size: 12px; margin-top: 2px;">
                ⚡ Explore as Guest (Instant Access)
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

    // Close Button
    container.querySelector('#btn-close-auth')?.addEventListener('click', (e) => {
      e.preventDefault();
      modalApi.close();
    });

    // Backdrop Click: Only close when clicking the semi-transparent backdrop directly
    sheet?.addEventListener('click', (e) => {
      if (e.target === sheet) {
        modalApi.close();
      }
    });

    // Toggle Sign Up / Log In
    container.querySelector('#btn-toggle-mode')?.addEventListener('click', (e) => {
      e.preventDefault();
      saveInputValues();
      mode = mode === 'signup' ? 'login' : 'signup';
      errorMessage = '';
      showGoogleFallback = false;
      render();
    });

    // Eye Password Visibility Toggle
    const btnTogglePass = container.querySelector('#btn-toggle-password');
    const passInput = container.querySelector('#auth-pass-input');
    if (btnTogglePass && passInput) {
      btnTogglePass.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showPassword = !showPassword;
        passInput.type = showPassword ? 'text' : 'password';
        btnTogglePass.innerHTML = showPassword ? Icons.eyeOff(18) : Icons.eye(18);
        btnTogglePass.setAttribute('title', showPassword ? 'Hide password' : 'Show password');
      });
    }

    // Dynamic Live Password Strength updates (typing in sign-up)
    if (mode === 'signup' && passInput) {
      passInput.addEventListener('input', () => {
        const val = passInput.value;
        formData.pass = val;
        const { score, label, level } = evaluatePasswordStrength(val);
        const labelEl = container.querySelector('#password-strength-label');
        if (labelEl) {
          labelEl.textContent = label;
          labelEl.style.color = level === 'weak' ? '#E53935' : level === 'medium' ? '#FB8C00' : level === 'strong' ? '#2E7D32' : 'var(--text-secondary)';
        }

        const bars = [
          container.querySelector('#pass-bar-1'),
          container.querySelector('#pass-bar-2'),
          container.querySelector('#pass-bar-3'),
          container.querySelector('#pass-bar-4')
        ];

        bars.forEach((bar, index) => {
          if (!bar) return;
          bar.className = 'password-strength-bar';
          if (index < score && val.length > 0) {
            bar.classList.add(`active-${level}`);
          }
        });
      });
    }

    // Google Sign-In
    container.querySelector('#btn-auth-google')?.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!networkService.isOnline && !navigator.onLine) {
        errorMessage = 'Internet connection required. Please connect to Wi-Fi to sign in with Google.';
        render();
        return;
      }

      try {
        isLoading = true;
        errorMessage = '';
        showGoogleFallback = false;
        render();

        const profile = await authService.signInWithGoogle();
        isLoading = false;
        modalApi.close();
        if (onAuthSuccess) onAuthSuccess(profile);
      } catch (err) {
        isLoading = false;
        console.warn('Google Sign-In caught error:', err);
        showGoogleFallback = true;
        fallbackType = err.code === 'auth/user-not-found' ? 'no-account' : 'google';
        errorMessage = err.message || 'Google Sign-In could not be completed.';
        render();
      }
    });

    // Quick Fallback Button (Google Fallback or No Account Fallback)
    container.querySelector('#btn-quick-fallback')?.addEventListener('click', async (e) => {
      e.preventDefault();
      saveInputValues();
      const name = formData.name || 'Music Lover';
      const email = formData.email;
      const profile = await authService.quickStartProfile(name, email);
      modalApi.close();
      if (onAuthSuccess) onAuthSuccess(profile);
    });

    // Switch to Sign Up from Fallback
    container.querySelector('#btn-switch-to-signup')?.addEventListener('click', (e) => {
      e.preventDefault();
      saveInputValues();
      mode = 'signup';
      errorMessage = '';
      showGoogleFallback = false;
      render();
    });

    // Guest Pass (Instant Access)
    container.querySelector('#btn-guest-pass')?.addEventListener('click', async (e) => {
      e.preventDefault();
      saveInputValues();
      const profile = await authService.quickStartProfile(formData.name || 'Guest Listener', formData.email);
      modalApi.close();
      if (onAuthSuccess) onAuthSuccess(profile);
    });

    // Quick Fill OTP
    container.querySelector('#btn-quick-fill-otp')?.addEventListener('click', (e) => {
      e.preventDefault();
      const otpInput = container.querySelector('#auth-otp-input');
      if (otpInput && authService.pendingOtp?.code) {
        otpInput.value = authService.pendingOtp.code;
        otpInput.focus();
      }
    });

    // Main Form Submit
    container.querySelector('#auth-main-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      saveInputValues();

      if (!networkService.isOnline && !navigator.onLine) {
        errorMessage = 'Internet connection required. Please connect to Wi-Fi to continue.';
        render();
        return;
      }

      if (mode === 'signup') {
        const { name, email, pass } = formData;

        // 1. Email format validation
        if (!email) {
          errorMessage = 'Please enter your email address.';
          render();
          return;
        }

        if (!isValidEmail(email)) {
          errorMessage = 'Please enter a valid email address (e.g. name@example.com).';
          render();
          return;
        }

        // 2. Strong Password validation
        if (!pass || pass.length < 8) {
          errorMessage = 'Password must be at least 8 characters long.';
          render();
          return;
        }

        const strength = evaluatePasswordStrength(pass);
        if (strength.level === 'weak' || !/[A-Z]/.test(pass) || !/[a-z]/.test(pass) || !/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) {
          errorMessage = 'Please choose a stronger password (must include uppercase, lowercase, and a number or symbol).';
          render();
          return;
        }

        try {
          isLoading = true;
          errorMessage = '';
          pendingEmail = email;
          pendingName = name;
          render();

          // Send 2-step verification OTP to user's email via Gmail transporter
          await authService.initiateSignUpWithOtp(name, email, pass);
          isLoading = false;
          mode = 'otp';
          render();
        } catch (err) {
          isLoading = false;
          errorMessage = err.message || 'Failed to send verification code. Please check your email.';
          render();
        }
      } else if (mode === 'otp') {
        const otpCode = container.querySelector('#auth-otp-input')?.value.trim();
        if (!otpCode || otpCode.length !== 6) {
          errorMessage = 'Please enter a valid 6-digit verification code.';
          render();
          return;
        }

        try {
          isLoading = true;
          errorMessage = '';
          render();

          const profile = await authService.verifyOtpAndCreateAccount(otpCode);
          isLoading = false;
          modalApi.close();
          if (onAuthSuccess) onAuthSuccess(profile);
        } catch (err) {
          isLoading = false;
          errorMessage = err.message || 'Invalid or expired code. Please try again.';
          render();
        }
      } else if (mode === 'login') {
        const { email, pass } = formData;

        // Email format validation on login
        if (!email) {
          errorMessage = 'Please enter your email address.';
          render();
          return;
        }

        if (!isValidEmail(email)) {
          errorMessage = 'Please enter a valid email address (e.g. name@example.com).';
          render();
          return;
        }

        if (!pass) {
          errorMessage = 'Please enter your password.';
          render();
          return;
        }

        try {
          isLoading = true;
          errorMessage = '';
          render();

          const profile = await authService.logIn(email, pass);
          isLoading = false;
          modalApi.close();
          if (onAuthSuccess) onAuthSuccess(profile);
        } catch (err) {
          isLoading = false;
          if (err.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email. Would you like to create one?';
            showGoogleFallback = true;
            fallbackType = 'no-account';
          } else {
            errorMessage = err.message || 'Invalid email or password. Please try again.';
          }
          render();
        }
      }
    });

    // OTP Resend
    container.querySelector('#btn-otp-resend')?.addEventListener('click', async () => {
      if (!authService.pendingOtp) return;
      try {
        const { name, email, password } = authService.pendingOtp;
        await authService.initiateSignUpWithOtp(name, email, password);
        errorMessage = '';
        render();
        alert(`New verification code sent to ${email}`);
      } catch (err) {
        errorMessage = 'Failed to resend code: ' + err.message;
        render();
      }
    });

    // OTP Back / Change Email
    container.querySelector('#btn-otp-back')?.addEventListener('click', () => {
      mode = 'signup';
      errorMessage = '';
      render();
    });
  }

  const modalApi = {
    open(initialMode = 'signup') {
      mode = initialMode;
      isOpen = true;
      errorMessage = '';
      showGoogleFallback = false;
      render();
    },
    close() {
      isOpen = false;
      render();
      if (onClose) onClose();
    },
    isOpen() {
      return isOpen;
    }
  };

  // Initial render (starts closed)
  render();

  return modalApi;
}
