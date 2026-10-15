// View 1: Onboarding Screen with 4 floating profiles, visible clouds & bespoke melo. logo
export function renderOnboardingView(container, { onSignUp, onLogIn, onSkip }) {
  container.innerHTML = `
    <div class="view view-onboarding active" id="view-onboarding">
      <!-- Visible Ambient Sculptural Clouds in Background -->
      <div class="ambient-clouds-layer">
        <div class="cloud-cluster cloud-1">
          <div class="cloud-body"></div>
          <div class="cloud-puff puff-left"></div>
          <div class="cloud-puff puff-center"></div>
          <div class="cloud-puff puff-right"></div>
        </div>
        <div class="cloud-cluster cloud-2">
          <div class="cloud-body"></div>
          <div class="cloud-puff puff-left"></div>
          <div class="cloud-puff puff-center"></div>
          <div class="cloud-puff puff-right"></div>
        </div>
        <div class="cloud-cluster cloud-3">
          <div class="cloud-body"></div>
          <div class="cloud-puff puff-left"></div>
          <div class="cloud-puff puff-center"></div>
          <div class="cloud-puff puff-right"></div>
        </div>
      </div>

      <!-- Top Header with Sculpted melo. Brand Logo -->
      <div class="onboarding-header">
        <div class="brand-logo-wrap" title="melo.">
          <div class="brand-logo-emblem">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10.5" fill="#111111" />
              <!-- Sculptural audio wave flow -->
              <path d="M 7.5 15 C 7.5 10 10 9 12 12.5 C 14 16 16.5 14 16.5 8.5" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="12" cy="6.2" r="1.4" fill="#FFFFFF" />
            </svg>
          </div>
          <div class="brand-logo-text">
            melo<span class="brand-logo-dot">.</span>
          </div>
        </div>

        <button class="btn-skip" id="btn-onboarding-skip">Skip</button>
      </div>

      <!-- Floating Organic Artist Showcase (4 Floating Profiles) -->
      <div class="onboarding-visual">
        <!-- Subtle Organic Wave Lines Background -->
        <svg class="contour-lines-bg" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="200" cy="200" rx="160" ry="140" stroke="rgba(0,0,0,0.07)" stroke-width="1.2" stroke-dasharray="4 4"/>
          <path d="M 50 220 Q 180 80 320 180 T 380 300" stroke="rgba(0,0,0,0.06)" stroke-width="1" fill="none"/>
          <path d="M 20 160 Q 200 280 360 120" stroke="rgba(0,0,0,0.05)" stroke-width="1" fill="none"/>
        </svg>

        <!-- 1. Top Right Bubble (Billie Eilish) -->
        <div class="floating-bubble bubble-pos-1">
          <div class="bubble-float-inner">
            <div class="bubble-img-wrapper" style="clip-path: url(#flower-mask-artist);">
              <img class="bubble-img" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80" alt="Billie Eilish" />
            </div>
          </div>
        </div>

        <!-- 2. Top Left Bubble (Travis Scott) -->
        <div class="floating-bubble bubble-pos-2">
          <div class="bubble-float-inner">
            <div class="bubble-img-wrapper" style="clip-path: url(#flower-mask-artist);">
              <img class="bubble-img" src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80" alt="Travis Scott" />
            </div>
          </div>
        </div>

        <!-- 3. Mid Right Bubble (Kendrick / Hip-Hop) -->
        <div class="floating-bubble bubble-pos-3">
          <div class="bubble-float-inner">
            <div class="bubble-img-wrapper" style="clip-path: url(#flower-mask-artist);">
              <img class="bubble-img" src="https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=400&q=80" alt="Artist preview" />
            </div>
          </div>
        </div>

        <!-- 4. Bottom Left Bubble (Lana Del Rey / Vibe) -->
        <div class="floating-bubble bubble-pos-4">
          <div class="bubble-float-inner">
            <div class="bubble-img-wrapper" style="clip-path: url(#flower-mask-artist);">
              <img class="bubble-img" src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80" alt="Lana Del Rey" />
            </div>
          </div>
        </div>
      </div>

      <!-- Hero Text & Action Buttons -->
      <div class="onboarding-hero">
        <h1 class="onboarding-title">
          Elevate Every<br />
          Moment With <strong>Music</strong>
        </h1>
        <p class="onboarding-desc">
          Immerse Yourself In A World Where Every Beat Enhances Your Mood And Every Melody Tells Your Story.
        </p>

        <div class="onboarding-actions">
          <button class="btn-black-pill" id="btn-onboarding-signup">
            Sign Up
          </button>
          <button class="login-text-link" id="btn-onboarding-login">
            Already Have An Account? <strong>Log In</strong>
          </button>
        </div>
      </div>
    </div>
  `;

  // Attach event listeners
  container.querySelector('#btn-onboarding-skip').addEventListener('click', onSkip);
  container.querySelector('#btn-onboarding-signup').addEventListener('click', onSignUp);
  container.querySelector('#btn-onboarding-login').addEventListener('click', onLogIn);
}
