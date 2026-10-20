import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle2, ShieldCheck, UserCheck, Sparkles } from 'lucide-react';
import { authService } from '../services/authService';

export function OnboardingAuthView({ onAuthSuccess, onSkipToArtists }) {
  const [mode, setMode] = useState('signup'); // 'signup' | 'login' | 'otp'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [fallbackMode, setFallbackMode] = useState(null); // 'guest' | 'no-account'
  const [devCodeHint, setDevCodeHint] = useState('');

  // Password strength calculator
  const evaluatePasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: 'Requires 8+ chars with uppercase, lowercase & numbers/symbols', level: 'empty' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score++;

    if (pass.length < 8) return { score: 1, label: `Too short (${pass.length}/8 characters)`, level: 'weak' };
    if (score <= 2) return { score: 2, label: 'Weak — add uppercase, numbers, or symbols', level: 'weak' };
    if (score === 3) return { score: 3, label: 'Medium strength — add a symbol or uppercase', level: 'medium' };
    return { score: 4, label: 'Strong password ✓', level: 'strong' };
  };

  const strength = evaluatePasswordStrength(password);

  // Email format validation
  const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val);

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setFallbackMode(null);

    if (mode === 'signup') {
      if (!email || !isValidEmail(email)) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }
      if (!password || password.length < 8) {
        setErrorMessage('Password must be at least 8 characters long.');
        return;
      }
      if (strength.level === 'weak') {
        setErrorMessage('Please create a stronger password (include uppercase, numbers or symbols).');
        return;
      }

      setIsLoading(true);
      try {
        const res = await authService.initiateSignUpWithOtp(name, email, password);
        setIsLoading(false);
        setMode('otp');
        if (res.devCode) {
          setDevCodeHint(res.devCode);
        }
      } catch (err) {
        setIsLoading(false);
        setErrorMessage(err.message || 'Failed to dispatch verification code.');
      }
    } else if (mode === 'login') {
      if (!email || !isValidEmail(email)) {
        setErrorMessage('Please enter your email address.');
        return;
      }
      if (!password) {
        setErrorMessage('Please enter your password.');
        return;
      }

      setIsLoading(true);
      try {
        const profile = await authService.logIn(email, password);
        setIsLoading(false);
        setSuccessNotice(`Welcome back, ${profile.name}! Opening your vault...`);
        setTimeout(() => {
          onAuthSuccess(profile);
        }, 600);
      } catch (err) {
        setIsLoading(false);
        if (err.code === 'auth/user-not-found') {
          setErrorMessage('No registered account was found with this email. Would you like to create one?');
          setFallbackMode('no-account');
        } else {
          setErrorMessage(err.message || 'Invalid email or password.');
        }
      }
    } else if (mode === 'otp') {
      if (!otpCode || otpCode.trim().length !== 6) {
        setErrorMessage('Please enter a valid 6-digit code.');
        return;
      }

      setIsLoading(true);
      try {
        const profile = await authService.verifyOtpAndCreateAccount(otpCode.trim());
        setIsLoading(false);
        setSuccessNotice(`Account activated! Welcome, ${profile.name}!`);
        setTimeout(() => {
          onAuthSuccess(profile);
        }, 600);
      } catch (err) {
        setIsLoading(false);
        setErrorMessage(err.message || 'Invalid or expired code.');
      }
    }
  };

  // Google Sign-In with Native Popup Window
  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setFallbackMode(null);
    setIsLoading(true);
    try {
      const profile = await authService.signInWithGoogle();
      setIsLoading(false);
      setSuccessNotice(`Logged in with Google as ${profile.name} ✓ Proceeding to setup...`);
      setTimeout(() => {
        onAuthSuccess(profile);
      }, 700);
    } catch (err) {
      setIsLoading(false);
      if (err.code === 'cancelled') {
        // User closed the popup modal; do not show an error banner
        return;
      }
      if (err.code === 'unauthorized-domain') {
        setFallbackMode('guest');
        setErrorMessage(err.message);
        return;
      }
      if (err.code === 'popup-blocked') {
        setErrorMessage('The Google Sign-In window was blocked by your browser. Please allow popups or use Email Sign-Up below.');
        return;
      }
      setErrorMessage(err.message || 'Google Sign-In could not be completed.');
    }
  };

  // Guest Mode Shortcut
  const handleGuestAccess = () => {
    const profile = authService.signInAsGuest();
    setSuccessNotice('Guest session active ✓ Launching sound universe...');
    setTimeout(() => {
      onAuthSuccess(profile);
    }, 500);
  };

  // OTP Resend
  const handleResendOtp = async () => {
    if (!authService.pendingOtp) return;
    try {
      const { name, email, password } = authService.pendingOtp;
      const res = await authService.initiateSignUpWithOtp(name, email, password);
      if (res.devCode) setDevCodeHint(res.devCode);
      setErrorMessage('');
      alert(`A new verification code has been dispatched to ${email}`);
    } catch (err) {
      setErrorMessage('Failed to resend code: ' + err.message);
    }
  };

  return (
    <div className="desktop-onboarding-wrapper">
      {/* Top Bar with Skip Button & Brand */}
      <header className="desktop-top-header">
        <div className="header-left-actions">
          {/* User Requested: Skip button top left */}
          <button 
            type="button" 
            className="btn-skip-pill" 
            onClick={onSkipToArtists}
            title="Skip directly to the Artist Selection screen to preview taste onboarding"
          >
            <span>Skip to Artist Selection</span>
            <ArrowRight size={15} />
          </button>
        </div>

        <div className="brand-logo-desktop" title="MUSE PC">
          <div className="brand-dot-badge">
            <span className="brand-emblem-glyph">M</span>
          </div>
          <span className="brand-name">
            muse<span className="brand-dot">.</span>
          </span>
          <span className="brand-tag">PC</span>
        </div>

        <div className="header-right-meta">
          <span className="version-pill">v1.0 Desktop Web</span>
        </div>
      </header>

      {/* Main Split-Screen Workspace */}
      <main className="desktop-main-split">
        {/* Left Column: Visual Artist Showcase & Atmosphere */}
        <section className="desktop-showcase-column">
          <div className="showcase-visual-stage">
            {/* Organic Background Contour Waves */}
            <svg className="contour-lines-bg-desktop" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="250" cy="250" rx="200" ry="170" stroke="rgba(0,0,0,0.06)" strokeWidth="1.5" strokeDasharray="6 6" />
              <path d="M 60 270 Q 220 100 400 220 T 480 370" stroke="rgba(0,0,0,0.05)" strokeWidth="1.2" fill="none" />
              <path d="M 30 200 Q 250 350 450 150" stroke="rgba(0,0,0,0.04)" strokeWidth="1.2" fill="none" />
            </svg>

            {/* 4 Signature Floating Artist Profiles with Real Avatars (scalloped floral mask) */}
            <div className="floating-bubble bubble-pos-1">
              <div className="bubble-float-inner">
                <div className="bubble-img-wrapper" style={{ clipPath: 'url(#flower-mask-artist)' }}>
                  <img
                    className="bubble-img"
                    src="https://i.scdn.co/image/ab6761610000e5ebd55c95ad400aed87da52daec"
                    alt="Ed Sheeran"
                    loading="lazy"
                  />
                </div>
                <span className="bubble-caption">Ed Sheeran</span>
              </div>
            </div>

            <div className="floating-bubble bubble-pos-2">
              <div className="bubble-float-inner">
                <div className="bubble-img-wrapper" style={{ clipPath: 'url(#flower-mask-artist)' }}>
                  <img
                    className="bubble-img"
                    src="https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9"
                    alt="Drake"
                    loading="lazy"
                  />
                </div>
                <span className="bubble-caption">Drake</span>
              </div>
            </div>

            <div className="floating-bubble bubble-pos-3">
              <div className="bubble-float-inner">
                <div className="bubble-img-wrapper" style={{ clipPath: 'url(#flower-mask-artist)' }}>
                  <img
                    className="bubble-img"
                    src="https://i.scdn.co/image/ab6761610000e5eb19c2790744c792d05570bb71"
                    alt="Travis Scott"
                    loading="lazy"
                  />
                </div>
                <span className="bubble-caption">Travis Scott</span>
              </div>
            </div>

            <div className="floating-bubble bubble-pos-4">
              <div className="bubble-float-inner">
                <div className="bubble-img-wrapper" style={{ clipPath: 'url(#flower-mask-artist)' }}>
                  <img
                    className="bubble-img"
                    src="https://i.scdn.co/image/ab6761610000e5ebb99cacf8acd5378206767261"
                    alt="Lana Del Rey"
                    loading="lazy"
                  />
                </div>
                <span className="bubble-caption">Lana Del Rey</span>
              </div>
            </div>
          </div>

          {/* Headline Typography & Narrative */}
          <div className="showcase-narrative">
            <h1 className="showcase-title">
              Elevate Every<br />
              Moment With <strong>Music</strong>
            </h1>
            <p className="showcase-desc">
              Immerse yourself in a world where every beat enhances your mood and every melody tells your story. High-fidelity streams, ad-free video theater, and synced lyrics on your desktop.
            </p>

            <div className="showcase-features-pills">
              <span className="feature-tag">
                <CheckCircle2 size={13} className="feature-icon" /> Lossless Audio
              </span>
              <span className="feature-tag">
                <CheckCircle2 size={13} className="feature-icon" /> Pure Ad-Free Video
              </span>
              <span className="feature-tag">
                <CheckCircle2 size={13} className="feature-icon" /> Cloud Sync
              </span>
            </div>
          </div>
        </section>

        {/* Right Column: Creative Desktop Frosted Ceramic Auth Card */}
        <section className="desktop-auth-column">
          <div className="auth-desktop-card">
            {/* Header / Mode Switcher */}
            <div className="auth-card-header">
              <div className="auth-header-labels">
                <span className="auth-eyebrow">
                  {mode === 'otp' ? 'Step 2 of 2: Security Verification' : 'Cloud Membership'}
                </span>
                <h2 className="auth-title">
                  {mode === 'otp' ? 'Verify Your Email' : mode === 'signup' ? 'Create Account' : 'Welcome Back'}
                </h2>
              </div>

              {mode !== 'otp' && (
                <div className="auth-tab-switch">
                  <button
                    type="button"
                    className={`auth-tab-btn ${mode === 'signup' ? 'active' : ''}`}
                    onClick={() => { setMode('signup'); setErrorMessage(''); setFallbackMode(null); }}
                  >
                    Sign Up
                  </button>
                  <button
                    type="button"
                    className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
                    onClick={() => { setMode('login'); setErrorMessage(''); setFallbackMode(null); }}
                  >
                    Log In
                  </button>
                </div>
              )}
            </div>

            <p className="auth-subtext">
              {mode === 'otp'
                ? `We dispatched a 6-digit verification code to ${email || 'your email'}. Enter it below to activate your account.`
                : mode === 'signup'
                ? 'Join MUSE to personalize your sonic vault, save offline tracks, and sync across PC.'
                : 'Log in to continue listening to your personalized mixes and favorites.'}
            </p>

            {/* Success Notice Banner */}
            {successNotice && (
              <div className="auth-success-banner">
                <CheckCircle2 size={16} />
                <span>{successNotice}</span>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="auth-error-banner">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Fallback Action Buttons */}
            {fallbackMode === 'guest' && (
              <div className="auth-fallback-box">
                <button
                  type="button"
                  className="btn-fallback-action"
                  onClick={handleGuestAccess}
                >
                  <Sparkles size={15} />
                  <span>Continue with Instant Guest Session</span>
                </button>
              </div>
            )}

            {fallbackMode === 'no-account' && (
              <div className="auth-fallback-box">
                <button
                  type="button"
                  className="btn-fallback-action"
                  onClick={() => {
                    setMode('signup');
                    setErrorMessage('');
                    setFallbackMode(null);
                  }}
                >
                  <UserCheck size={15} />
                  <span>Create Account with {email}</span>
                </button>
              </div>
            )}

            {/* Dev Mode Code Helper (helps testing without real email access) */}
            {devCodeHint && mode === 'otp' && (
              <div className="auth-dev-hint">
                <ShieldCheck size={16} />
                <span>Dev Preview Code: <strong>{devCodeHint}</strong></span>
              </div>
            )}

            {/* Google One-Tap Sign In with Small Popup Window */}
            {mode !== 'otp' && (
              <>
                <button
                  type="button"
                  className="btn-google-desktop"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  title="Sign in with your Google account via secure popup window"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
                  </svg>
                  <span>{isLoading ? 'Opening Google Account Picker...' : 'Continue with Google'}</span>
                </button>

                <div className="auth-divider">
                  <div className="divider-line" />
                  <span className="divider-text">or with email</span>
                  <div className="divider-line" />
                </div>
              </>
            )}

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="auth-form-fields">
              {mode === 'signup' && (
                <>
                  <div className="input-group">
                    <label className="input-label">Your Name</label>
                    <input
                      type="text"
                      className="desktop-input"
                      placeholder="e.g. Maya Chen"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Email Address</label>
                    <input
                      type="email"
                      className="desktop-input"
                      placeholder="name@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Create Password</label>
                    <div className="password-input-container">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="desktop-input"
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        className="btn-toggle-eye"
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {/* Dynamic Password Strength Indicator */}
                    <div className="password-meter-wrap">
                      <div className="meter-bars">
                        {[1, 2, 3, 4].map((barIndex) => (
                          <div
                            key={barIndex}
                            className={`meter-bar ${password && barIndex <= strength.score ? `active-${strength.level}` : ''}`}
                          />
                        ))}
                      </div>
                      <span className={`meter-label ${strength.level}`}>
                        {strength.label}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn-primary-auth"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Sending verification code...' : 'Continue with Email'}
                  </button>
                </>
              )}

              {mode === 'login' && (
                <>
                  <div className="input-group">
                    <label className="input-label">Email Address</label>
                    <input
                      type="email"
                      className="desktop-input"
                      placeholder="name@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Password</label>
                    <div className="password-input-container">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="desktop-input"
                        placeholder="Your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="btn-toggle-eye"
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn-primary-auth"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Log In'}
                  </button>
                </>
              )}

              {mode === 'otp' && (
                <div className="otp-step-group">
                  <label className="input-label text-center">Enter 6-Digit Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    className="desktop-input-otp"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                    required
                  />

                  <button
                    type="submit"
                    className="btn-primary-auth"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Verifying...' : 'Verify & Set Up Vault'}
                  </button>

                  <div className="otp-actions-row">
                    <button
                      type="button"
                      className="btn-link-action"
                      onClick={handleResendOtp}
                    >
                      Resend Code
                    </button>
                    <button
                      type="button"
                      className="btn-link-action"
                      onClick={() => { setMode('signup'); setErrorMessage(''); setFallbackMode(null); }}
                    >
                      Change Email
                    </button>
                  </div>
                </div>
              )}
            </form>

            {/* Bottom Footer Note */}
            <div className="auth-card-footer">
              {mode === 'signup' ? (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="btn-text-switch"
                    onClick={() => { setMode('login'); setErrorMessage(''); setFallbackMode(null); }}
                  >
                    Log In
                  </button>
                </p>
              ) : mode === 'login' ? (
                <p>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    className="btn-text-switch"
                    onClick={() => { setMode('signup'); setErrorMessage(''); setFallbackMode(null); }}
                  >
                    Sign Up
                  </button>
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
