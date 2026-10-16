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
assert(mainJs.includes('Storage.hasCompletedOnboarding()'), 'main.js routes directly to home if onboarding already completed');
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

// 15. Downloads Page: Downloading Spinner & Clean Tick Indicator
console.log('\n--- 15. Downloads Page: Downloading Spinner & Clean Tick Status ---');
const libraryViewJs = fs.readFileSync(path.join(projectRoot, 'src/ui/libraryView.js'), 'utf8');
assert(libraryViewJs.includes('download-status-badge'), 'libraryView.js includes download-status-badge');
assert(libraryViewJs.includes('melo-mini-spinner'), 'libraryView.js shows melo-mini-spinner while track is downloading');
assert(libraryViewJs.includes('Icons.check(11)'), 'libraryView.js shows clean check icon instead of Offline Ready text');
assert(!libraryViewJs.includes('✓ Offline Ready'), 'libraryView.js does not render verbose Offline Ready text');
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
assert(!authModal.includes('btn-guest-pass'), 'authModal eliminates guest testing mode bypass');
assert(fs.existsSync(path.join(projectRoot, 'api/send-otp.js')), 'api/send-otp.js Vercel serverless function exists');
assert(fs.existsSync(path.join(projectRoot, 'api/send-welcome.js')), 'api/send-welcome.js Vercel serverless function exists');
assert(authModal.includes('${isOpen ? \'open\' : \'\'}'), 'authModal template keeps open state persistent across renders');
assert(!authModal.includes('otp-helper-pill') && !authModal.includes('btn-quick-fill-otp'), 'authModal does NOT display OTP on screen (OTP is strictly private to email)');
assert(mainJs.includes('alreadyOnboarded') && mainJs.includes("this.navigateTo('artist-select', false)"), 'main.js cleanly navigates forward to artist-select or home without history back collisions');

// 20. Offline PWA, Search Playback Fallback, Liked Songs Icon & Native Android Bottom Toast
console.log('\n--- 20. Liked Songs Fixes, Offline Resilience & Android Bottom Toast ---');
assert(iconsJs.includes('download: (size = 20)'), 'icons.js defines Icons.download for library and offline downloads');
assert(fs.existsSync(path.join(projectRoot, 'api/youtube-search.js')), 'api/youtube-search.js serverless function exists');
assert(fs.existsSync(path.join(projectRoot, 'api/artist-search.js')), 'api/artist-search.js serverless function exists');

const musicSearchJs = fs.readFileSync(path.join(projectRoot, 'src/services/musicSearchService.js'), 'utf8');
assert(musicSearchJs.includes('audioUrl: t.previewUrl || null'), 'musicSearchService includes previewUrl fallback for instant audio playback');
assert(musicSearchJs.includes('AbortController()'), 'musicSearchService handles YouTube search timeouts cleanly');

assert(!indexHtml.includes('https://www.youtube.com/iframe_api'), 'index.html does not block initial offline rendering with external YouTube script');

const swJs = fs.readFileSync(path.join(projectRoot, 'public/sw.js'), 'utf8');
assert(swJs.includes('melo-music-v2'), 'sw.js uses updated cache version melo-music-v2');
assert(swJs.includes("req.mode === 'navigate'"), 'sw.js provides robust navigate offline fallback to index.html');

assert(styleCss.includes('.global-toast-banner') && styleCss.includes('bottom: calc('), 'style.css positions global-toast-banner at the bottom');
assert(styleCss.includes('toastBottomPop'), 'style.css animates bottom toast smoothly');

assert(storage.includes('Array.isArray(favs) && favs.length >= 3'), 'storage.js hasCompletedOnboarding acknowledges already saved favorite artists');

// 21. Logout Session Expiry, Non-Destructive Click Safety & Error Boundaries
console.log('\n--- 21. Logout Session Expiry, Click Safety & Error Boundaries ---');
const homeViewJs = fs.readFileSync(path.join(projectRoot, 'src/ui/homeView.js'), 'utf8');
assert(homeViewJs.includes('onLogout'), 'homeView.js accepts onLogout prop for clean session teardown');
assert(!homeViewJs.includes("showToast('Testing internet throughput ping...'"), 'homeView.js network click does not trigger destructive DOM rebuilding');
assert(!homeViewJs.includes('Testing Mode Active'), 'homeView.js has removed all Testing Mode Active labels');
assert(storage.includes('clearSession'), 'storage.js includes clearSession method for thorough logout cleanup');
assert(mainJs.includes("this.authModal.open('signup')"), 'main.js directs unauthenticated users directly to sign up');
assert(mainJs.includes("Melo error boundary caught"), 'main.js registers global error boundary to prevent white screens');
assert(mainJs.includes("Melo unhandled rejection caught"), 'main.js catches unhandled promise rejections safely');

const libViewJs = fs.readFileSync(path.join(projectRoot, 'src/ui/libraryView.js'), 'utf8');
assert(!libViewJs.includes("alert('No audio files found in the chosen directory.')"), 'libraryView.js uses toasts instead of blocking alerts');
assert(libViewJs.includes("switchTab('device')"), 'libraryView.js uses safe switchTab instead of destructive innerHTML reload');

// 22. Thubbing Sound Elimination, Visibility Resilience, Full Online Liked Songs & Clean Tick Status
console.log('\n--- 22. Thubbing Sound Elimination & Full Online Liked Songs ---');
const audioEngineCode = fs.readFileSync(path.join(projectRoot, 'src/services/audioEngine.js'), 'utf8');
assert(!audioEngineCode.includes('SILENT_AUDIO_URI'), 'audioEngine.js removed looping silent audio carrier to eliminate thubbing sound');
assert(audioEngineCode.includes('initVisibilityListener'), 'audioEngine.js listens to visibility change for background playback resilience');
assert(audioEngineCode.includes('if (audioBlob && (!navigator.onLine || isDeviceTrack))'), 'audioEngine.js prevents 30s preview blob from overriding online full song');
assert(storage.includes('resolvedYoutubeId'), 'storage.js preserves and resolves full YouTube stream ID when song is liked');

const playlistViewJs = fs.readFileSync(path.join(projectRoot, 'src/ui/playlistView.js'), 'utf8');
assert(playlistViewJs.includes('Icons.check(11)'), 'playlistView.js shows clean check icon on liked songs');
assert(!playlistViewJs.includes('✓ Offline Ready'), 'playlistView.js does not render verbose Offline Ready text');

// 23. Smart Up Next Queue & Recommendation Suggestions (No Duplicate Title Flooding)
console.log('\n--- 23. Smart Up Next Queue & Recommendation Suggestions ---');
const searchViewJs = fs.readFileSync(path.join(projectRoot, 'src/ui/searchView.js'), 'utf8');
assert(searchViewJs.includes('getSmartQueueForTrack'), 'searchView.js calls getSmartQueueForTrack when selecting search result');
assert(!searchViewJs.includes('audioEngine.setQueue(currentResults'), 'searchView.js does not dump raw search results into queue');

const queueModalJs = fs.readFileSync(path.join(projectRoot, 'src/ui/queueModal.js'), 'utf8');
assert(queueModalJs.includes('ensureQueueDepth') || queueModalJs.includes('getSmartQueueForTrack'), 'queueModal.js proactively enriches low queue with smart suggestions on open');

const musicSearchServiceJs = fs.readFileSync(path.join(projectRoot, 'src/services/musicSearchService.js'), 'utf8');
assert(musicSearchServiceJs.includes('getSmartQueueForTrack(track'), 'musicSearchService.js implements getSmartQueueForTrack');
assert(musicSearchServiceJs.includes('titleUpper !== baseTitle'), 'musicSearchService excludes duplicate titles matching the searched track title');

// 24. MUSE Rebranding & Cross-Artist Algorithmic Radio Up Next with Endless Queue Auto-Refill
console.log('\n--- 24. MUSE Rebranding & Cross-Artist Algorithmic Radio Up Next ---');
assert(fs.existsSync(path.join(projectRoot, 'api/radio-recommendations.js')), 'api/radio-recommendations.js serverless endpoint exists');
assert(musicSearchServiceJs.includes('/api/radio-recommendations'), 'musicSearchService.js integrates with algorithmic radio recommendations endpoint');
assert(audioEngineCode.includes('ensureQueueDepth'), 'audioEngine.js implements ensureQueueDepth for endless non-repeating queue auto-refill');
const indexHtmlContent = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
assert(indexHtmlContent.includes('MUSE — Elevate Every Moment With Sound'), 'index.html has MUSE title');
assert(indexHtmlContent.includes('content="MUSE"'), 'index.html has apple-mobile-web-app-title MUSE');
const manifestContent = fs.readFileSync(path.join(projectRoot, 'public/manifest.json'), 'utf8');
assert(manifestContent.includes('"short_name": "MUSE"'), 'manifest.json has short_name MUSE');
const pkgContent = fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8');
assert(pkgContent.includes('"name": "muse"'), 'package.json has name muse');

console.log(`\n==========================================`);
console.log(`RESULTS: ${passedTests}/${totalTests} tests passed`);
console.log(`==========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}


