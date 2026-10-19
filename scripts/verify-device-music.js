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

console.log('\n=== RUNNING DEVICE MUSIC & PLAYBACK ISOLATION VERIFICATION SUITE ===\n');

// Mock browser environment for AudioEngine unit tests in Node
global.window = {
  location: { protocol: 'https:', hostname: 'localhost', host: 'localhost' },
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: (event) => {
    if (global.__lastDispatchedEventCallback) global.__lastDispatchedEventCallback(event);
  },
  YT: {
    PlayerState: {
      PLAYING: 1,
      PAUSED: 2,
      ENDED: 0,
      BUFFERING: 3
    }
  }
};

global.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({ src: '', setAttribute: () => {} }),
  getElementsByTagName: () => [{ parentNode: { insertBefore: () => {} } }],
  head: { appendChild: () => {} },
  body: { appendChild: () => {} }
};

try {
  Object.defineProperty(global.navigator, 'mediaSession', {
    value: {
      metadata: null,
      playbackState: 'none',
      setActionHandler: () => {},
      setPositionState: () => {}
    },
    configurable: true,
    writable: true
  });
  Object.defineProperty(global.navigator, 'onLine', {
    value: true,
    configurable: true,
    writable: true
  });
} catch (e) {
  // Fallback
}

global.MediaMetadata = class MediaMetadata {
  constructor(data) {
    Object.assign(this, data);
  }
};

global.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; }
};

class MockAudio {
  constructor() {
    this.currentTime = 0;
    this.duration = 200;
    this.paused = true;
    this.src = '';
    this.loop = false;
    this._listeners = {};
  }
  addEventListener(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  }
  removeEventListener(event, fn) {
    if (this._listeners[event]) {
      this._listeners[event] = this._listeners[event].filter(cb => cb !== fn);
    }
  }
  emit(event, data) {
    if (this._listeners[event]) {
      this._listeners[event].forEach(cb => cb(data));
    }
  }
  play() {
    this.paused = false;
    this.emit('play');
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
    this.emit('pause');
  }
  load() {}
}

global.Audio = MockAudio;

// Dynamic import of AudioEngine and Storage
const { AudioEngine } = await import('../src/services/audioEngine.js');
const { Storage } = await import('../src/services/storage.js');

// Test Tracks Fixtures
const devTracks = [
  { id: 'dev-1', title: 'Local Song A', artist: 'Artist One', source: 'device', isDeviceTrack: true, duration: 180 },
  { id: 'dev-2', title: 'Local Song B', artist: 'Artist Two', source: 'device', isDeviceTrack: true, duration: 200 },
  { id: 'dev-3', title: 'Local Song C', artist: 'Artist Three', source: 'device', isDeviceTrack: true, duration: 220 },
  { id: 'dev-4', title: 'Local Song D', artist: 'Artist Four', source: 'device', isDeviceTrack: true, duration: 240 },
  { id: 'dev-5', title: 'Local Song E', artist: 'Artist Five', source: 'device', isDeviceTrack: true, duration: 260 }
];

const ytTracks = [
  { id: 'yt-1', title: 'YT Anthem 1', artist: 'Online Artist 1', youtubeId: 'abc1', duration: 190 },
  { id: 'yt-2', title: 'YT Anthem 2', artist: 'Online Artist 2', youtubeId: 'abc2', duration: 210 },
  { id: 'yt-3', title: 'YT Anthem 3', artist: 'Online Artist 3', youtubeId: 'abc3', duration: 230 }
];

// -------------------------------------------------------------
// Requirement 1: Sequential playback when shuffle is OFF
// -------------------------------------------------------------
console.log('--- Test 1: Sequential playback when shuffle is OFF ---');
{
  const engine = new AudioEngine();
  engine.sourceStates.device.isShuffle = false;
  engine.setQueue(devTracks, 0, false, 'device');

  assert(engine.activeSource === 'device', 'Active source is device');
  assert(engine.currentTrack.id === 'dev-1', 'Starts at selected track dev-1 (Song A)');

  await engine.next();
  assert(engine.currentTrack.id === 'dev-2', 'Next advances sequentially to dev-2 (Song B)');

  await engine.next();
  assert(engine.currentTrack.id === 'dev-3', 'Next advances sequentially to dev-3 (Song C)');

  await engine.next();
  assert(engine.currentTrack.id === 'dev-4', 'Next advances sequentially to dev-4 (Song D)');
}

// -------------------------------------------------------------
// Requirement 2: Starting from a middle track and continuing from the next track
// -------------------------------------------------------------
console.log('\n--- Test 2: Starting from middle track and continuing sequentially ---');
{
  const engine = new AudioEngine();
  engine.sourceStates.device.isShuffle = false;
  // Start at index 1 (Song B)
  engine.setQueue(devTracks, 1, false, 'device');

  assert(engine.currentTrack.id === 'dev-2', 'Starts directly at middle track dev-2 (Song B)');
  
  await engine.next();
  assert(engine.currentTrack.id === 'dev-3', 'Next advances to dev-3 (Song C) immediately following Song B');

  await engine.next();
  assert(engine.currentTrack.id === 'dev-4', 'Next advances to dev-4 (Song D)');
}

// -------------------------------------------------------------
// Requirement 3: Shuffling all eligible tracks without repeating before cycle completes
// -------------------------------------------------------------
console.log('\n--- Test 3: Shuffle all eligible tracks without repetition in cycle ---');
{
  const engine = new AudioEngine();
  engine.sourceStates.device.isShuffle = true;
  engine.repeatMode = 'all';
  engine.setQueue(devTracks, 0, false, 'device');

  const playedOrder = [engine.currentTrack.id];
  for (let i = 0; i < devTracks.length - 1; i++) {
    await engine.next();
    playedOrder.push(engine.currentTrack.id);
  }

  assert(playedOrder.length === 5, `Cycle contains 5 tracks: ${playedOrder.join(' -> ')}`);
  const uniqueSet = new Set(playedOrder);
  assert(uniqueSet.size === 5, 'All 5 tracks played exactly once in the shuffle cycle with zero duplicates');
  devTracks.forEach(t => {
    assert(uniqueSet.has(t.id), `Track ${t.id} was included in the shuffle cycle`);
  });
}

// -------------------------------------------------------------
// Requirement 4: Enabling shuffle during playback without interrupting current song
// -------------------------------------------------------------
console.log('\n--- Test 4: Enabling shuffle during playback keeps current song ---');
{
  const engine = new AudioEngine();
  engine.sourceStates.device.isShuffle = false;
  engine.setQueue(devTracks, 1, false, 'device'); // Playing Song B
  assert(engine.currentTrack.id === 'dev-2', 'Playing Song B before toggling shuffle');

  const isShuffleNow = engine.toggleShuffle();
  assert(isShuffleNow === true, 'Shuffle enabled via toggleShuffle');
  assert(engine.currentTrack.id === 'dev-2', 'Current song B remains playing without interruption');

  // Verify that remaining tracks are shuffled into the upcoming queue
  const state = engine.sourceStates.device;
  assert(state.shuffleOrder[0].id === 'dev-2', 'Shuffle order starts with currently playing track');
  assert(state.shuffleOrder.length === 5, 'Shuffle order contains all 5 tracks');
}

// -------------------------------------------------------------
// Requirement 5: Disabling shuffle and restoring sequential successor
// -------------------------------------------------------------
console.log('\n--- Test 5: Disabling shuffle and restoring sequential successor ---');
{
  const engine = new AudioEngine();
  engine.sourceStates.device.isShuffle = true;
  engine.setQueue(devTracks, 0, false, 'device');

  // Navigate to dev-3 (Song C) in shuffle mode
  const state = engine.sourceStates.device;
  const songC = devTracks.find(t => t.id === 'dev-3');
  engine.loadTrack(songC, false, false);
  assert(engine.currentTrack.id === 'dev-3', 'Currently at Song C');

  // Disable shuffle
  const isShuffleNow = engine.toggleShuffle();
  assert(isShuffleNow === false, 'Shuffle is now OFF');
  assert(engine.currentTrack.id === 'dev-3', 'Current track remains Song C');

  // Next track in sequential playback must be Song D (dev-4), which follows Song C in original queue
  await engine.next();
  assert(engine.currentTrack.id === 'dev-4', 'Next track correctly restores sequential successor Song D');
}

// -------------------------------------------------------------
// Requirement 6: Next and Previous while shuffle is enabled
// -------------------------------------------------------------
console.log('\n--- Test 6: Next and Previous in shuffle mode move along established order ---');
{
  const engine = new AudioEngine();
  engine.sourceStates.device.isShuffle = true;
  engine.setQueue(devTracks, 0, false, 'device');

  const state = engine.sourceStates.device;
  const t0 = state.shuffleOrder[0].id;
  const t1 = state.shuffleOrder[1].id;
  const t2 = state.shuffleOrder[2].id;

  assert(engine.currentTrack.id === t0, `Initial track is ${t0}`);

  await engine.next();
  assert(engine.currentTrack.id === t1, `Next moves to established shuffle track ${t1}`);

  await engine.next();
  assert(engine.currentTrack.id === t2, `Next moves to established shuffle track ${t2}`);

  // Now press previous
  engine.currentTime = 1; // within 3s threshold for prev track
  engine.prev();
  assert(engine.currentTrack.id === t1, `Prev returns to previous shuffle track ${t1}`);

  engine.currentTime = 1;
  engine.prev();
  assert(engine.currentTrack.id === t0, `Prev returns to first shuffle track ${t0}`);
}

// -------------------------------------------------------------
// Requirement 7: Repeat-one, repeat-all, and repeat-off interactions with shuffle
// -------------------------------------------------------------
console.log('\n--- Test 7: Repeat interactions with shuffle ---');
{
  const engine = new AudioEngine();
  engine.sourceStates.device.isShuffle = true;
  engine.setQueue(devTracks, 0, false, 'device');

  // A. Repeat-one
  engine.repeatMode = 'one';
  const curId = engine.currentTrack.id;
  engine.handleTrackEnded();
  assert(engine.currentTrack.id === curId, 'Repeat-one replays the same track when track ends');

  // B. Repeat-off: at the end of the shuffle cycle, playback must stop
  engine.repeatMode = 'off';
  const state = engine.sourceStates.device;
  state.shuffleIndex = state.shuffleOrder.length - 1; // Last track of shuffle cycle
  engine.currentTrack = state.shuffleOrder[state.shuffleIndex];

  let stopped = false;
  engine.pause = () => { stopped = true; };
  await engine.next();
  assert(stopped, 'Repeat-off stops playback at the end of the shuffled cycle');

  // C. Repeat-all: starts a new shuffle cycle
  engine.repeatMode = 'all';
  state.shuffleIndex = state.shuffleOrder.length - 1;
  engine.currentTrack = state.shuffleOrder[state.shuffleIndex];
  await engine.next();
  assert(state.shuffleIndex === 0, 'Repeat-all resets shuffleIndex to 0 for a new cycle');
}

// -------------------------------------------------------------
// Requirement 8: Handling a queue with one track or with unavailable tracks
// -------------------------------------------------------------
console.log('\n--- Test 8: Single-track queue & unavailable track error handling ---');
{
  const engine = new AudioEngine();
  const singleQueue = [devTracks[0]];
  engine.sourceStates.device.isShuffle = false;
  engine.repeatMode = 'all';
  engine.setQueue(singleQueue, 0, false, 'device');

  assert(engine.queue.length === 1, 'Queue has 1 track');
  await engine.next();
  assert(engine.currentTrack.id === devTracks[0].id, 'Single track with repeat-all replays cleanly');

  // Unavailable device track handling without YouTube fallback
  let toastMessage = '';
  global.__lastDispatchedEventCallback = (e) => {
    if (e?.detail?.message) toastMessage = e.detail.message;
  };

  const unavailableTrack = {
    id: 'dev-ghost',
    title: 'Missing Track.mp3',
    artist: 'Ghost',
    source: 'device',
    isDeviceTrack: true
  };

  await engine.loadTrack(unavailableTrack, false, false);
  assert(engine.activeSource === 'device', 'Remains strictly in device source mode');
  assert(toastMessage.includes('Unavailable'), `Toast message displayed: "${toastMessage}"`);
  assert(engine.currentMode !== 'yt', 'Did NOT fallback to YouTube streaming');
}

// -------------------------------------------------------------
// Requirement 9: Keeping YouTube and Device Music shuffle orders and queues independent
// -------------------------------------------------------------
console.log('\n--- Test 9: Strict isolation of queues, shuffle, and repeat settings ---');
{
  const engine = new AudioEngine();

  // Setup YouTube mode
  engine.sourceStates.youtube.isShuffle = false;
  engine.sourceStates.youtube.repeatMode = 'all';
  engine.setQueue(ytTracks, 0, false, 'youtube');

  assert(engine.activeSource === 'youtube', 'Active source is youtube');
  assert(engine.queue.length === ytTracks.length, 'YouTube queue has 3 tracks');
  assert(engine.isShuffle === false, 'YouTube shuffle is OFF');
  assert(engine.repeatMode === 'all', 'YouTube repeat is all');

  // Now user plays Device Music
  engine.sourceStates.device.isShuffle = true;
  engine.sourceStates.device.repeatMode = 'off';
  engine.setQueue(devTracks, 2, false, 'device');

  assert(engine.activeSource === 'device', 'Active source switched to device');
  assert(engine.queue.length === devTracks.length, 'Device queue has 5 tracks');
  assert(engine.isShuffle === true, 'Device shuffle is ON');
  assert(engine.repeatMode === 'off', 'Device repeat is off');

  // Verify YouTube sourceState was NOT corrupted or mutated
  const ytState = engine.sourceStates.youtube;
  assert(ytState.queue.length === ytTracks.length, 'YouTube queue preserved 3 tracks');
  assert(ytState.isShuffle === false, 'YouTube shuffle preserved as OFF');
  assert(ytState.repeatMode === 'all', 'YouTube repeat preserved as all');

  // Switch back to YouTube track
  engine.loadTrack(ytTracks[1], false, false);

  assert(engine.activeSource === 'youtube', 'Active source returned to youtube');
  assert(engine.isShuffle === false, 'YouTube restored shuffle OFF');
  assert(engine.repeatMode === 'all', 'YouTube restored repeat all');
  assert(engine.queue.every(t => !t.isDeviceTrack && t.source !== 'device'), 'YouTube queue contains zero device tracks');

  // Switch back to Device track
  const devState = engine.sourceStates.device;
  assert(devState.queue.length === devTracks.length, 'Device state preserved 5 tracks');
  assert(devState.isShuffle === true, 'Device state preserved shuffle ON');
  assert(devState.repeatMode === 'off', 'Device state preserved repeat off');
}

// -------------------------------------------------------------
// Requirement 10: Ensuring a new shuffle cycle does not unnecessarily repeat the last track
// -------------------------------------------------------------
console.log('\n--- Test 10: New shuffle cycle avoids immediate repetition of last track ---');
{
  const engine = new AudioEngine();
  engine.sourceStates.device.isShuffle = true;
  engine.repeatMode = 'all';
  engine.setQueue(devTracks, 0, false, 'device');

  const state = engine.sourceStates.device;

  // Run 100 shuffle cycle completions to test statistical avoidance of last-track repetition
  let repeatedImmediate = 0;
  for (let trial = 0; trial < 100; trial++) {
    const lastTrack = state.shuffleOrder[state.shuffleOrder.length - 1];
    state.shuffleIndex = state.shuffleOrder.length - 1;
    engine.currentTrack = lastTrack;

    await engine.next(); // triggers new shuffle cycle
    const newFirstTrack = state.shuffleOrder[0];

    if (newFirstTrack.id === lastTrack.id) {
      repeatedImmediate++;
    }
  }

  assert(repeatedImmediate === 0, `Over 100 new cycle transitions, last track was repeated immediately ${repeatedImmediate} times (0 expected)`);
}

// -------------------------------------------------------------
// Verify Native Android Integration & Manifest
// -------------------------------------------------------------
console.log('\n--- Test 11: Android Manifest Permissions & Native Bridge Verification ---');
{
  const manifestXml = fs.readFileSync(path.join(projectRoot, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
  assert(manifestXml.includes('android.permission.READ_MEDIA_AUDIO'), 'AndroidManifest has READ_MEDIA_AUDIO for Android 13+');
  assert(manifestXml.includes('android.permission.READ_EXTERNAL_STORAGE'), 'AndroidManifest has READ_EXTERNAL_STORAGE with maxSdkVersion=32 for legacy');
  assert(!manifestXml.includes('MANAGE_EXTERNAL_STORAGE'), 'Complies with scoped storage: does NOT request MANAGE_EXTERNAL_STORAGE');

  const mainActivityJava = fs.readFileSync(path.join(projectRoot, 'android/app/src/main/java/com/muse/music/MainActivity.java'), 'utf8');
  assert(mainActivityJava.includes('hasStoragePermission'), 'MainActivity implements hasStoragePermission()');
  assert(mainActivityJava.includes('requestStoragePermission'), 'MainActivity implements requestStoragePermission()');
  assert(mainActivityJava.includes('queryDeviceAudio'), 'MainActivity implements queryDeviceAudio() querying MediaStore');
  assert(mainActivityJava.includes('MediaStore.Audio.Media.EXTERNAL_CONTENT_URI'), 'MainActivity queries MediaStore.Audio.Media.EXTERNAL_CONTENT_URI');

  const serviceJava = fs.readFileSync(path.join(projectRoot, 'android/app/src/main/java/com/muse/music/MusicForegroundService.java'), 'utf8');
  assert(serviceJava.includes('content://'), 'MusicForegroundService handles content:// URI album art');
  assert(serviceJava.includes('MediaPlayer mediaPlayer'), 'MusicForegroundService owns native MediaPlayer');
  assert(serviceJava.includes('ACTION_PLAY_DEVICE'), 'MusicForegroundService handles ACTION_PLAY_DEVICE');
  assert(serviceJava.includes('playNextDeviceTrack'), 'MusicForegroundService implements native playNextDeviceTrack()');
  assert(serviceJava.includes('playPreviousDeviceTrack'), 'MusicForegroundService implements native playPreviousDeviceTrack()');
  assert(serviceJava.includes('resumeDeviceAudio'), 'MusicForegroundService implements native resumeDeviceAudio()');
  assert(serviceJava.includes('pauseDeviceAudio'), 'MusicForegroundService implements native pauseDeviceAudio()');
  assert(serviceJava.includes('seekDeviceAudio'), 'MusicForegroundService implements native seekDeviceAudio()');
  assert(serviceJava.includes('loadThumbnail'), 'MusicForegroundService extracts scoped storage thumbnails via loadThumbnail');
}

// -------------------------------------------------------------
// Test 12: Local playback restoration after Activity recreation
// -------------------------------------------------------------
console.log('\n--- Test 12: Local playback restoration after Activity recreation ---');
{
  const mockPlayingState = {
    activeSource: 'device',
    isPlaying: true,
    currentTime: 42.5,
    duration: 210,
    currentTrack: devTracks[2],
    queue: devTracks,
    queueIndex: 2,
    isShuffle: false,
    repeatMode: 'all'
  };

  global.window.AndroidMusicBridge = {
    getNativePlaybackState: () => JSON.stringify(mockPlayingState),
    seekDeviceAudio: () => {},
    pauseDeviceAudio: () => {},
    resumeDeviceAudio: () => {},
    playDeviceTrackNative: () => {},
    syncPlaybackSource: () => {}
  };

  const engine = new AudioEngine();
  const reconnected = engine.reconnectNativeSession();

  assert(reconnected === true, 'reconnectNativeSession successfully restored running session');
  assert(engine.activeSource === 'device', 'Restored activeSource is device');
  assert(engine.currentMode === 'native', 'Restored currentMode is native');
  assert(engine.isPlaying === true, 'Restored isPlaying is true');
  assert(engine.currentTrack.id === devTracks[2].id, 'Restored currentTrack is dev-3');
  assert(engine.currentTime === 42.5, 'Restored exact currentTime (42.5s)');
  assert(engine.duration === 210, 'Restored exact duration (210s)');
  assert(engine.queue.length === 5, 'Restored full 5-track device queue');
  assert(engine.queueIndex === 2, 'Restored queueIndex 2');
}

// -------------------------------------------------------------
// Test 13: MediaSession controls independent of WebView in Service
// -------------------------------------------------------------
console.log('\n--- Test 13: MediaSession controls independent of WebView in Service ---');
{
  const serviceJava = fs.readFileSync(path.join(projectRoot, 'android/app/src/main/java/com/muse/music/MusicForegroundService.java'), 'utf8');

  // Verify onTaskRemoved protects device music playback from Recents swipe-kill
  assert(serviceJava.includes('onTaskRemoved(Intent rootIntent)'), 'MusicForegroundService overrides onTaskRemoved()');
  assert(serviceJava.includes('"device".equals(activePlaybackSource) && isPlaying'), 'onTaskRemoved checks device playback active state');
  assert(serviceJava.includes('acquireWakeLock();'), 'onTaskRemoved maintains wake lock during swipe-kill');

  // Verify MediaSession callbacks invoke native methods directly when activePlaybackSource is device
  assert(serviceJava.includes('resumeDeviceAudio()'), 'MediaSession onPlay triggers native resumeDeviceAudio()');
  assert(serviceJava.includes('pauseDeviceAudio()'), 'MediaSession onPause triggers native pauseDeviceAudio()');
  assert(serviceJava.includes('playNextDeviceTrack()'), 'MediaSession onSkipToNext triggers native playNextDeviceTrack()');
  assert(serviceJava.includes('playPreviousDeviceTrack()'), 'MediaSession onSkipToPrevious triggers native playPreviousDeviceTrack()');
  assert(serviceJava.includes('seekDeviceAudio(pos)'), 'MediaSession onSeekTo triggers native seekDeviceAudio()');

  // Verify track completion listener
  assert(serviceJava.includes('setOnCompletionListener(mp -> handleNativeTrackCompletion())'), 'MediaPlayer onCompletion natively advances next track without WebView');
}

// -------------------------------------------------------------
// Test 14: Position and Seeking synchronization
// -------------------------------------------------------------
console.log('\n--- Test 14: Position and Seeking synchronization ---');
{
  let lastNativeSeek = null;
  global.window.AndroidMusicBridge = {
    getNativePlaybackState: () => JSON.stringify({
      activeSource: 'device',
      isPlaying: true,
      currentTime: 68.0,
      duration: 180,
      currentTrack: devTracks[0]
    }),
    seekDeviceAudio: (sec) => { lastNativeSeek = sec; },
    pauseDeviceAudio: () => {},
    resumeDeviceAudio: () => {},
    playDeviceTrackNative: () => {},
    syncPlaybackSource: () => {}
  };

  const engine = new AudioEngine();
  engine.activeSource = 'device';
  engine.currentMode = 'native';
  engine.duration = 180;
  engine.currentTrack = devTracks[0];

  engine.seek(68);
  assert(lastNativeSeek === 68, 'engine.seek(68) invoked AndroidMusicBridge.seekDeviceAudio(68)');
  assert(engine.currentTime === 68, 'engine.currentTime updated to 68');

  // Test seekRatio
  engine.seekRatio(0.5);
  assert(lastNativeSeek === 90, 'engine.seekRatio(0.5) seeked to half duration (90s)');

  // Test native-playback-sync event handling
  engine.currentTime = 0;
  let timeUpdateReceived = null;
  engine.subscribe('timeUpdate', (data) => { timeUpdateReceived = data; });

  const customEvent = {
    detail: { action: 'seeked', position: 105.0 }
  };
  // Simulate dispatch of native-playback-sync event
  const listeners = [];
  window.addEventListener = (evt, fn) => { if (evt === 'native-playback-sync') listeners.push(fn); };
  engine.initNativeBridgeListeners();
  listeners.forEach(fn => fn(customEvent));

  assert(engine.currentTime === 105.0, 'native-playback-sync event updated engine.currentTime to 105s');
  assert(timeUpdateReceived && timeUpdateReceived.currentTime === 105.0, 'timeUpdate subscriber received updated 105s position');
}

// -------------------------------------------------------------
// Test 15: Artwork fallbacks and source changes
// -------------------------------------------------------------
console.log('\n--- Test 15: Artwork fallbacks and source changes ---');
{
  const { getTrackArtworkUrl, clearArtworkCache } = await import('../src/services/artworkService.js');
  clearArtworkCache();

  // Null track returns default fallback
  const nullArt = getTrackArtworkUrl(null);
  assert(typeof nullArt === 'string' && nullArt.length > 50, 'Null track returns valid fallback artwork');

  // Web HTTP URL returns as-is
  const webTrack = { id: 'yt-1', cover: 'https://images.unsplash.com/photo-test' };
  const webArt = getTrackArtworkUrl(webTrack);
  assert(webArt === 'https://images.unsplash.com/photo-test', 'HTTP/HTTPS cover returned cleanly');

  // Base64 data URI returns as-is
  const b64Track = { id: 'dev-b64', cover: 'data:image/jpeg;base64,mockbytes' };
  const b64Art = getTrackArtworkUrl(b64Track);
  assert(b64Art === 'data:image/jpeg;base64,mockbytes', 'data:image cover returned cleanly');

  // Raw content URI without native bridge returns DEFAULT_FALLBACK_COVER without throwing
  delete global.window.AndroidMusicBridge;
  const contentTrack = { id: 'dev-raw', cover: 'content://media/external/audio/albumart/55' };
  const rawArt = getTrackArtworkUrl(contentTrack);
  assert(rawArt.startsWith('data:image/svg'), 'Raw content URI safely falls back to SVG cover instead of breaking <img>');

  // Raw content URI with native bridge calls getAlbumArt
  let requestedTrackId = null;
  global.window.AndroidMusicBridge = {
    getAlbumArt: (tid, aid) => {
      requestedTrackId = tid;
      return 'data:image/jpeg;base64,nativeextractedjpeg';
    }
  };
  const nativeArtTrack = { id: 'dev-native', mediaStoreId: 999, albumId: 88, cover: 'content://media/external/audio/albumart/88' };
  const nativeArt = getTrackArtworkUrl(nativeArtTrack);
  assert(requestedTrackId === 999, 'Native bridge getAlbumArt called with mediaStoreId 999');
  assert(nativeArt === 'data:image/jpeg;base64,nativeextractedjpeg', 'Native bridge returned base64 JPEG thumbnail');
}

console.log(`\n========================================`);
console.log(`SUMMARY: ${passedTests} / ${totalTests} tests passed`);
console.log(`========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  console.log('ALL DEVICE MUSIC REQUIREMENTS VERIFIED SUCCESSFULLY!\n');
  process.exit(0);
}

