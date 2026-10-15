import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('\n=== RUNNING MELO VERIFICATION SUITE ===\n');

// 1. Check Icon Assets
console.log('--- 1. App Icon and Favicon Assets ---');
const expectedIcons = [
  'public/favicon.ico',
  'public/favicon.png',
  'public/icons/icon-192.png',
  'public/icons/icon-512.png',
  'public/icons/logo.png',
  'public/icons/logo-badge.png',
  'src/assets/logo.png',
  'src/assets/logo-badge.png'
];

for (const iconPath of expectedIcons) {
  const fullPath = path.join(projectRoot, iconPath);
  const exists = fs.existsSync(fullPath);
  const size = exists ? fs.statSync(fullPath).size : 0;
  assert(exists && size > 500, `Asset exists with valid size: ${iconPath} (${size} bytes)`);
}

// 2. Check index.html & manifest.json
console.log('\n--- 2. HTML and PWA Manifest Links ---');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
assert(indexHtml.includes('href="/favicon.png"'), 'index.html links to /favicon.png');
assert(indexHtml.includes('href="/favicon.ico"'), 'index.html links to /favicon.ico');
assert(indexHtml.includes('href="/icons/icon-192.png"'), 'index.html links to apple-touch-icon');

const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, 'public/manifest.json'), 'utf8'));
assert(manifest.icons.some(i => i.src === '/icons/icon-192.png'), 'manifest.json contains icon-192');
assert(manifest.icons.some(i => i.src === '/icons/icon-512.png'), 'manifest.json contains icon-512');

// 3. Skip Buttons Removal
console.log('\n--- 3. Verify Removal of Skip Buttons ---');
const onboardingView = fs.readFileSync(path.join(projectRoot, 'src/ui/onboardingView.js'), 'utf8');
assert(!onboardingView.includes('btn-onboarding-skip') && !onboardingView.includes('>Skip<'), 'onboardingView has no skip button');

const authModal = fs.readFileSync(path.join(projectRoot, 'src/ui/authModal.js'), 'utf8');
assert(!authModal.includes('btn-auth-skip'), 'authModal has no skip button');

const artistSelectView = fs.readFileSync(path.join(projectRoot, 'src/ui/artistSelectView.js'), 'utf8');
assert(!artistSelectView.includes('btn-artist-skip') && !artistSelectView.includes('>Skip<'), 'artistSelectView has no skip button');

const setupLoadingView = fs.readFileSync(path.join(projectRoot, 'src/ui/setupLoadingView.js'), 'utf8');
assert(!setupLoadingView.includes('btn-skip-setup') && !setupLoadingView.includes('>Skip<'), 'setupLoadingView has no skip button');

// 4. Mandatory Artist Selection
console.log('\n--- 4. Mandatory Artist Selection (At least 3) ---');
assert(artistSelectView.includes('const MIN_ARTISTS = 3'), 'artistSelectView enforces MIN_ARTISTS = 3');
assert(artistSelectView.includes('id="selection-counter"'), 'artistSelectView provides dynamic selection counter pill');
assert(artistSelectView.includes('btnContinue.disabled = !isReady'), 'artistSelectView disables continue button until >= 3 selected');

// 5. WiFi / Network Guard on Auth
console.log('\n--- 5. WiFi / Network Guard on Sign Up and Login ---');
const authService = fs.readFileSync(path.join(projectRoot, 'src/services/authService.js'), 'utf8');
assert(authService.includes('!networkService.isOnline && !navigator.onLine'), 'authService verifies online connection before OTP / account creation');
assert(onboardingView.includes('!networkService.isOnline && !navigator.onLine'), 'onboardingView verifies online connection before open');
assert(authModal.includes('!networkService.isOnline && !navigator.onLine'), 'authModal checks online connection before auth actions');

// 6. One-Time Spotify-style Onboarding
console.log('\n--- 6. One-Time Spotify-Style Onboarding ---');
const storage = fs.readFileSync(path.join(projectRoot, 'src/services/storage.js'), 'utf8');
assert(storage.includes('hasCompletedOnboarding'), 'storage.js has hasCompletedOnboarding method');
assert(storage.includes('setCompletedOnboarding'), 'storage.js has setCompletedOnboarding method');

const mainJs = fs.readFileSync(path.join(projectRoot, 'src/main.js'), 'utf8');
assert(mainJs.includes('if (Storage.hasCompletedOnboarding())'), 'main.js routes directly to home if onboarding already completed');
assert(setupLoadingView.includes('Storage.setCompletedOnboarding(true)'), 'setupLoadingView marks onboarding as completed');

// 7. Email Branding & Onboarding Email
console.log('\n--- 7. Email Branding & Onboarding Welcome Email ---');
const viteConfig = fs.readFileSync(path.join(projectRoot, 'vite.config.js'), 'utf8');
assert(viteConfig.includes("cid: 'melologo'"), 'vite.config.js embeds Melo logo with cid:melologo');
assert(viteConfig.includes("server.middlewares.use('/api/send-welcome'"), 'vite.config.js has /api/send-welcome endpoint');
assert(setupLoadingView.includes('authService.sendWelcomeEmail'), 'setupLoadingView dispatches onboarding welcome email');
assert(viteConfig.includes('Your Selected Artist Foundation'), 'vite.config.js has organized artist foundation section');
assert(viteConfig.includes('color: #1E7227') && viteConfig.includes('✓'), 'vite.config.js lists selected artists with green checkmark ticks');
assert(viteConfig.includes('Everything Included With Your Account'), 'vite.config.js provides comprehensive feature breakdown');
assert(viteConfig.includes('3 Quick Tips to Get Started'), 'vite.config.js includes quick start tips for listeners');

// 8. Password Strength & Email Format Validation
console.log('\n--- 8. Password Strength & Email Format Validation ---');
assert(authModal.includes('isValidEmail'), 'authModal contains isValidEmail validation regex');
assert(authModal.includes('evaluatePasswordStrength'), 'authModal evaluates password strength');
assert(authModal.includes('password-strength-bars'), 'authModal provides visual password strength meter');
assert(authModal.includes('Password must be at least 8 characters'), 'authModal enforces min 8 character password');
assert(authModal.includes('Please choose a stronger password'), 'authModal requires strong password combination on signup');
assert(authModal.includes('Please enter a valid email address'), 'authModal enforces valid email format on signup and login');

// 9. WiFi Signal Indicator (Online WiFi vs Offline Grey WifiOff)
console.log('\n--- 9. Dynamic WiFi Signal Online / Offline Indicator ---');
const iconsJs = fs.readFileSync(path.join(projectRoot, 'src/ui/icons.js'), 'utf8');
assert(iconsJs.includes('wifi: (size = 18)'), 'icons.js has wifi icon');
assert(iconsJs.includes('wifiOff: (size = 18)'), 'icons.js has wifiOff icon with strike-through line');

const homeView = fs.readFileSync(path.join(projectRoot, 'src/ui/homeView.js'), 'utf8');
assert(homeView.includes("isOnline ? Icons.wifi(18) : Icons.wifiOff(18)"), 'homeView renders Icons.wifi when online and Icons.wifiOff when offline');
assert(homeView.includes("online-wifi' : 'offline-wifi"), 'homeView applies online-wifi or offline-wifi class');

const styleCss = fs.readFileSync(path.join(projectRoot, 'src/style.css'), 'utf8');
assert(styleCss.includes('.btn-circle-nav.offline-wifi'), 'style.css defines grey styling for offline-wifi');
assert(styleCss.includes('.btn-circle-nav.online-wifi'), 'style.css defines active styling for online-wifi');

// 10. Artist Selection: No Auto-Select & Text-Only Green on 3+
console.log('\n--- 10. Artist Selection: No Auto-Select & Text-Only Green Pill ---');
assert(artistSelectView.includes('const savedFavorites = new Set();'), 'artistSelectView always starts with 0 selected (no auto-selection)');
assert(artistSelectView.includes("counter.style.background = 'transparent';"), 'selection counter pill background is transparent on 3+');
assert(artistSelectView.includes("counter.style.color = '#1E7227';"), 'selection counter pill text turns green (#1E7227) on 3+');

// 11. Replace Say Yes To Heaven with Playable Hit (God's Plan)
console.log('\n--- 11. Sample Tracks: Replaced Say Yes To Heaven with Gods Plan ---');
const samplesJs = fs.readFileSync(path.join(projectRoot, 'src/data/samples.js'), 'utf8');
assert(!samplesJs.includes('sample-say-yes-to-heaven'), 'sample-say-yes-to-heaven removed from samples.js');
assert(samplesJs.includes('sample-gods-plan'), 'sample-gods-plan added to samples.js');
assert(samplesJs.includes('xpVfcZ0ZcFM'), 'Gods Plan has valid YouTube video ID xpVfcZ0ZcFM');

// 12. Song Progress Bar: Circular Orbit Scrubber Exclusivity & Real-time Tracking
console.log('\n--- 12. Song Progress Bar: Circular Orbit Scrubber Exclusivity ---');
const playerViewJs = fs.readFileSync(path.join(projectRoot, 'src/ui/playerView.js'), 'utf8');
assert(!playerViewJs.includes('player-linear-bar-track'), 'playerView.js does not include linear progress bar (keeping only circular)');
assert(playerViewJs.includes('orbit-progress-fill'), 'playerView.js uses circular orbit progress fill');
assert(playerViewJs.includes('orbit-scrubber-dot'), 'playerView.js uses circular orbit scrubber dot');
assert(playerViewJs.includes('updateCircleScrubber(progress)'), 'playerView.js updates circular scrubber dynamically with song progress');
assert(playerViewJs.includes("orbitSvg.addEventListener('mousedown'"), 'playerView.js supports scrubbing circular progress bar on drag/touch');

const audioEngineJs = fs.readFileSync(path.join(projectRoot, 'src/services/audioEngine.js'), 'utf8');
assert(audioEngineJs.includes('this.startYouTubeProgressTracker()'), 'audioEngine.js starts progress tracker on play and load');
assert(audioEngineJs.includes("this.notify('timeUpdate'"), 'audioEngine.js notifies timeUpdate event with currentTime and duration');

// 13. Setup Loading View: No Auto-Inflating Unselected Artists
console.log('\n--- 13. Setup Loading: Strictly User-Selected Artists ---');
// 14. Liked Songs Toast Feedback & Auto-Download
console.log('\n--- 14. Liked Songs Toast Feedback & Storage ---');
assert(storage.includes("window.dispatchEvent(new CustomEvent('melo-toast'"), 'storage.js dispatches melo-toast on song like/unlike');
assert(mainJs.includes("window.addEventListener('melo-toast'"), 'main.js listens to melo-toast event globally');

// 15. Downloads Page: Downloading Spinner & Offline Ready Status
console.log('\n--- 15. Downloads Page: Downloading Spinner & Live State ---');
const libraryViewJs = fs.readFileSync(path.join(projectRoot, 'src/ui/libraryView.js'), 'utf8');
assert(libraryViewJs.includes('download-status-badge'), 'libraryView.js includes download-status-badge');
assert(libraryViewJs.includes('melo-mini-spinner'), 'libraryView.js shows melo-mini-spinner while track is downloading');
assert(libraryViewJs.includes('Offline Ready'), 'libraryView.js shows Offline Ready when track download finishes');
assert(libraryViewJs.includes("window.addEventListener('melo-download-complete'"), 'libraryView.js reacts to melo-download-complete event');

// 16. Liked Songs Page / Modal Navigation from Metrics
console.log('\n--- 16. Liked Songs Navigation ---');
assert(homeView.includes('btn-metric-liked-songs'), 'homeView.js has clickable btn-metric-liked-songs metric item');
assert(homeView.includes('btn-profile-metric-liked'), 'homeView.js has clickable btn-profile-metric-liked item');

// 17. Circular Progress Bar SVG Transform & Reset
console.log('\n--- 17. Circular Progress Bar Transform & Audio Sync ---');
assert(playerViewJs.includes('transform="rotate(-90'), 'playerView.js applies SVG rotate(-90) on orbit-progress-fill');
assert(audioEngineJs.includes("this.notify('timeUpdate', {\n      currentTime: 0"), 'audioEngine.js resets timeUpdate to 0 on new track load');

// 18. Environment Variables and Credentials Security
console.log('\n--- 18. Environment Variables and Credentials Security ---');
const gitignore = fs.readFileSync(path.join(projectRoot, '.gitignore'), 'utf8');
assert(gitignore.includes('.env') && gitignore.includes('!.env.example'), '.gitignore ignores .env while allowing .env.example');
assert(fs.existsSync(path.join(projectRoot, '.env.example')), '.env.example template file exists');

const firebaseJs = fs.readFileSync(path.join(projectRoot, 'src/config/firebase.js'), 'utf8');
assert(firebaseJs.includes('import.meta.env.VITE_FIREBASE_API_KEY'), 'firebase.js reads API key from import.meta.env.VITE_FIREBASE_API_KEY');
assert(!firebaseJs.includes('AIzaSyCWsTjzGo1m4wk-dx2vrfcfFCrJZHkbAVE'), 'firebase.js contains NO hardcoded Firebase API keys');

assert(viteConfig.includes("import { defineConfig, loadEnv } from 'vite'"), 'vite.config.js imports loadEnv from vite');
assert(viteConfig.includes('const env = loadEnv(mode, process.cwd(), \'\')'), 'vite.config.js loads environment variables with loadEnv');
assert(viteConfig.includes('env.EMAIL_USER') && viteConfig.includes('env.EMAIL_PASS'), 'vite.config.js reads EMAIL_USER and EMAIL_PASS from env');
assert(!viteConfig.includes('hbbgiaavokfvjnxq'), 'vite.config.js contains NO hardcoded email app password');

// 19. Password Eye Visibility Toggle & Auth Stability & Google Fallback
console.log('\n--- 19. Password Visibility Toggle & Google Auth Fallback ---');
assert(iconsJs.includes('eye: (size = 20)') && iconsJs.includes('eyeOff: (size = 20)'), 'icons.js contains eye and eyeOff icons');
assert(authModal.includes('btn-toggle-password'), 'authModal provides password visibility toggle button with eye icon');
assert(authModal.includes('password-input-wrap'), 'authModal wraps password input in password-input-wrap');
assert(authModal.includes('google-fallback-box'), 'authModal provides Google auth and account not found fallback');
assert(authModal.includes('btn-guest-pass'), 'authModal provides instant guest / demo access for zero friction');
assert(authService.includes('quickStartProfile'), 'authService provides quickStartProfile method for seamless fallback');
assert(fs.existsSync(path.join(projectRoot, 'api/send-otp.js')), 'api/send-otp.js Vercel serverless function exists');
assert(fs.existsSync(path.join(projectRoot, 'api/send-welcome.js')), 'api/send-welcome.js Vercel serverless function exists');
assert(authModal.includes('${isOpen ? \'open\' : \'\'}'), 'authModal template keeps open state persistent across renders');

console.log(`\n==========================================`);
console.log(`RESULTS: ${passedTests}/${totalTests} tests passed`);
console.log(`==========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}


