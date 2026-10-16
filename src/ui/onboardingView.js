// View 1: Onboarding Screen with 4 floating profiles, visible clouds & bespoke melo. logo
import { networkService } from '../services/networkService.js';

export function renderOnboardingView(container, { onSignUp, onLogIn }) {
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

      <!-- Top Header with Sculpted muse. Brand Logo -->
      <div class="onboarding-header">
        <div class="brand-logo-wrap" title="muse.">
          <div class="brand-logo-emblem" style="background: transparent; border: none; box-shadow: none; width: 34px; height: 34px;">
            <img src="/icons/logo-badge.png" alt="MUSE Logo" style="width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.18));" />
          </div>
          <div class="brand-logo-text">
            muse<span class="brand-logo-dot">.</span>
          </div>
        </div>
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

        <!-- Offline notice if disconnected -->
        <div id="onboarding-network-notice" style="display: none; background: rgba(229, 57, 53, 0.08); border: 1px solid rgba(229, 57, 53, 0.25); border-radius: 14px; padding: 10px 14px; font-size: 12.5px; color: #D32F2F; text-align: center; margin-bottom: 8px;">
          Internet connection required. Please connect to Wi-Fi to sign up or log in.
        </div>

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

  const notice = container.querySelector('#onboarding-network-notice');

  function checkNetworkAndProceed(action) {
    if (!networkService.isOnline && !navigator.onLine) {
      if (notice) {
        notice.style.display = 'block';
        setTimeout(() => { notice.style.display = 'none'; }, 4000);
      }
      return;
    }
    if (action) action();
  }

  // Attach event listeners (Strict sign up / login, no skip)
  container.querySelector('#btn-onboarding-signup')?.addEventListener('click', () => {
    checkNetworkAndProceed(onSignUp);
  });
  container.querySelector('#btn-onboarding-login')?.addEventListener('click', () => {
    checkNetworkAndProceed(onLogIn);
  });
}
