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

// 12. Song Progress Bar Moving with Song
console.log('\n--- 12. Song Progress Bar Tracking & Seeking ---');
const playerViewJs = fs.readFileSync(path.join(projectRoot, 'src/ui/playerView.js'), 'utf8');
assert(playerViewJs.includes('player-linear-bar-track'), 'playerView.js includes linear progress bar track');
assert(playerViewJs.includes('player-linear-bar-fill'), 'playerView.js includes linear progress bar fill');
assert(playerViewJs.includes('linearTrack.addEventListener(\'click\''), 'playerView.js supports clicking to seek on progress bar');
assert(mainJs.includes('mini-progress-fill'), 'main.js includes mini-player progress fill');

const audioEngineJs = fs.readFileSync(path.join(projectRoot, 'src/services/audioEngine.js'), 'utf8');
assert(audioEngineJs.includes('this.startYouTubeProgressTracker()'), 'audioEngine.js starts progress tracker on play and load');
assert(audioEngineJs.includes("this.notify('timeUpdate'"), 'audioEngine.js notifies timeUpdate event with currentTime and duration');

// 13. Setup Loading View: No Auto-Inflating Unselected Artists
console.log('\n--- 13. Setup Loading: Strictly User-Selected Artists ---');
assert(!setupLoadingView.includes('selectedArtists = [...selectedArtists, ...remaining].slice(0, 7);'), 'setupLoadingView does not fill up with unselected artists');

console.log(`\n==========================================`);
console.log(`RESULTS: ${passedTests}/${totalTests} tests passed`);
console.log(`==========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
