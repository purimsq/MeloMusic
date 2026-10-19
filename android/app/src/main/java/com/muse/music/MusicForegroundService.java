package com.muse.music;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.ContentUris;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.SystemClock;
import android.provider.MediaStore;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.util.Base64;
import android.util.Size;

import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;
import androidx.media.session.MediaButtonReceiver;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MusicForegroundService extends Service {
    public static final String CHANNEL_ID = "muse_playback_channel";
    public static final int NOTIFICATION_ID = 1001;
    private static final String PREFS_NAME = "muse_playback_prefs";

    public static final String ACTION_START = "com.muse.music.action.START";
    public static final String ACTION_UPDATE = "com.muse.music.action.UPDATE";
    public static final String ACTION_STOP = "com.muse.music.action.STOP";
    public static final String ACTION_TOGGLE = "com.muse.music.action.TOGGLE";
    public static final String ACTION_NEXT = "com.muse.music.action.NEXT";
    public static final String ACTION_PREV = "com.muse.music.action.PREV";
    public static final String ACTION_PLAY_DEVICE = "com.muse.music.action.PLAY_DEVICE";
    public static final String ACTION_PAUSE_DEVICE = "com.muse.music.action.PAUSE_DEVICE";
    public static final String ACTION_RESUME_DEVICE = "com.muse.music.action.RESUME_DEVICE";
    public static final String ACTION_SEEK_DEVICE = "com.muse.music.action.SEEK_DEVICE";

    private static volatile MusicForegroundService instance;

    private MediaSessionCompat mediaSession;
    private PowerManager.WakeLock wakeLock;
    private final ExecutorService imageExecutor = Executors.newSingleThreadExecutor();

    // Native Media Player & Audio Focus for Reliable Device Music
    private MediaPlayer mediaPlayer;
    private AudioManager audioManager;
    private AudioManager.OnAudioFocusChangeListener audioFocusListener;

    // Playback state & metadata
    private String activePlaybackSource = "youtube"; // "youtube" | "device"
    private String currentTitle = "MUSE Track";
    private String currentArtist = "Playing Audio";
    private String currentAlbum = "MUSE";
    private String currentCoverUrl = "";
    private long currentMediaStoreId = 0;
    private long currentAlbumId = 0;
    private long currentDurationMs = 0;
    private long currentPositionMs = 0;
    private boolean isPlaying = false;
    private Bitmap cachedCoverBitmap = null;

    // Isolated Native Device Queue
    private final List<JSONObject> nativeDeviceQueue = new ArrayList<>();
    private int nativeDeviceQueueIndex = 0;
    private boolean nativeDeviceShuffle = false;
    private String nativeDeviceRepeatMode = "all"; // "off", "all", "one"
    private JSONObject currentDeviceTrack = null;

    public static MusicForegroundService getInstance() {
        return instance;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        createNotificationChannel();
        acquireWakeLock();
        initAudioFocus();
        initMediaPlayer();
        initMediaSession();
    }

    private void initAudioFocus() {
        try {
            audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            audioFocusListener = focusChange -> {
                if ("device".equals(activePlaybackSource)) {
                    switch (focusChange) {
                        case AudioManager.AUDIOFOCUS_LOSS:
                        case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                            pauseDeviceAudio();
                            break;
                        case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                            if (mediaPlayer != null && isPlaying) {
                                try { mediaPlayer.setVolume(0.2f, 0.2f); } catch (Exception ignored) {}
                            }
                            break;
                        case AudioManager.AUDIOFOCUS_GAIN:
                            if (mediaPlayer != null) {
                                try {
                                    mediaPlayer.setVolume(1.0f, 1.0f);
                                    if (!isPlaying) {
                                        resumeDeviceAudio();
                                    }
                                } catch (Exception ignored) {}
                            }
                            break;
                    }
                } else {
                    if (focusChange == AudioManager.AUDIOFOCUS_LOSS || focusChange == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
                        MainActivity.dispatchMediaAction("pause");
                    }
                }
            };
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private boolean requestAudioFocus() {
        if (audioManager == null) return true;
        try {
            int result = audioManager.requestAudioFocus(
                    audioFocusListener,
                    AudioManager.STREAM_MUSIC,
                    AudioManager.AUDIOFOCUS_GAIN
            );
            return result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        } catch (Exception e) {
            return true;
        }
    }

    private void abandonAudioFocus() {
        if (audioManager != null && audioFocusListener != null) {
            try {
                audioManager.abandonAudioFocus(audioFocusListener);
            } catch (Exception ignored) {}
        }
    }

    private void initMediaPlayer() {
        if (mediaPlayer != null) return;
        try {
            mediaPlayer = new MediaPlayer();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                AudioAttributes attrs = new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .build();
                mediaPlayer.setAudioAttributes(attrs);
            } else {
                mediaPlayer.setAudioStreamType(AudioManager.STREAM_MUSIC);
            }
            mediaPlayer.setWakeMode(getApplicationContext(), PowerManager.PARTIAL_WAKE_LOCK);

            mediaPlayer.setOnPreparedListener(mp -> {
                if (isPlaying) {
                    mp.start();
                    currentPositionMs = mp.getCurrentPosition();
                    currentDurationMs = mp.getDuration();
                    updateMediaSessionStateAndMetadata();
                    updateNotification();
                    notifyWebViewPlaybackSync("playing", currentPositionMs, currentDurationMs);
                }
            });

            mediaPlayer.setOnCompletionListener(mp -> handleNativeTrackCompletion());

            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                isPlaying = false;
                updateMediaSessionStateAndMetadata();
                updateNotification();
                notifyWebViewPlaybackSync("error", 0, 0);
                return true;
            });

            mediaPlayer.setOnSeekCompleteListener(mp -> {
                currentPositionMs = mp.getCurrentPosition();
                updateMediaSessionStateAndMetadata();
                notifyWebViewPlaybackSync("seeked", currentPositionMs, currentDurationMs);
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void initMediaSession() {
        mediaSession = new MediaSessionCompat(this, "MUSE_MediaSession");
        mediaSession.setFlags(
                MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS |
                MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
        );

        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                super.onPlay();
                if ("device".equals(activePlaybackSource)) {
                    resumeDeviceAudio();
                } else {
                    MainActivity.dispatchMediaAction("play");
                }
            }

            @Override
            public void onPause() {
                super.onPause();
                if ("device".equals(activePlaybackSource)) {
                    pauseDeviceAudio();
                } else {
                    MainActivity.dispatchMediaAction("pause");
                }
            }

            @Override
            public void onSkipToNext() {
                super.onSkipToNext();
                if ("device".equals(activePlaybackSource)) {
                    playNextDeviceTrack();
                } else {
                    MainActivity.dispatchMediaAction("next");
                }
            }

            @Override
            public void onSkipToPrevious() {
                super.onSkipToPrevious();
                if ("device".equals(activePlaybackSource)) {
                    playPreviousDeviceTrack();
                } else {
                    MainActivity.dispatchMediaAction("previous");
                }
            }

            @Override
            public void onSeekTo(long pos) {
                super.onSeekTo(pos);
                if ("device".equals(activePlaybackSource)) {
                    seekDeviceAudio(pos);
                } else {
                    currentPositionMs = pos;
                    MainActivity.dispatchSeekAction(pos / 1000.0);
                    updateMediaSessionStateAndMetadata();
                }
            }

            @Override
            public void onStop() {
                super.onStop();
                if ("device".equals(activePlaybackSource)) {
                    stopDeviceAudio();
                } else {
                    MainActivity.dispatchMediaAction("pause");
                }
                stopForeground(true);
                stopSelf();
            }

            @Override
            public boolean onMediaButtonEvent(Intent mediaButtonEvent) {
                return super.onMediaButtonEvent(mediaButtonEvent);
            }
        });

        mediaSession.setActive(true);
    }

    private void acquireWakeLock() {
        try {
            if (wakeLock == null) {
                PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (powerManager != null) {
                    wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "MUSE:AudioKeepAliveWakeLock");
                    wakeLock.setReferenceCounted(false);
                }
            }
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(12 * 60 * 60 * 1000L); // 12 hours max safety limit
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void setActivePlaybackSource(String source) {
        if (source != null) {
            this.activePlaybackSource = source;
            if ("youtube".equals(source) && mediaPlayer != null && isPlaying) {
                stopDeviceAudio();
            }
        }
    }

    public String getActivePlaybackSource() {
        return activePlaybackSource;
    }

    // --- NATIVE DEVICE MUSIC PLAYBACK ENGINE ---

    public void playDeviceTrackNative(JSONObject track, boolean autoPlay) {
        if (track == null) return;
        activePlaybackSource = "device";
        currentDeviceTrack = track;
        currentTitle = track.optString("title", "Device Music");
        currentArtist = track.optString("artist", "Local Track");
        currentAlbum = track.optString("album", "MUSE");
        currentCoverUrl = track.optString("cover", "");
        currentMediaStoreId = track.optLong("mediaStoreId", 0);
        currentAlbumId = track.optLong("albumId", 0);
        long durSec = track.optLong("duration", 0);
        if (durSec > 0) currentDurationMs = durSec * 1000L;
        currentPositionMs = 0;

        String contentUriStr = track.optString("contentUri", "");
        if (contentUriStr.isEmpty()) {
            contentUriStr = track.optString("filePath", "");
        }

        if (contentUriStr.isEmpty()) {
            return;
        }

        initMediaPlayer();
        try {
            mediaPlayer.reset();
            Uri uri = Uri.parse(contentUriStr);
            mediaPlayer.setDataSource(getApplicationContext(), uri);
            isPlaying = autoPlay;
            mediaPlayer.prepareAsync();

            if (autoPlay) {
                requestAudioFocus();
            }

            loadCoverArtAsync(currentCoverUrl, currentMediaStoreId, currentAlbumId);
            updateMediaSessionStateAndMetadata();
            startAsForegroundService();
        } catch (Exception e) {
            e.printStackTrace();
            isPlaying = false;
            updateMediaSessionStateAndMetadata();
            updateNotification();
        }
    }

    public void pauseDeviceAudio() {
        if (mediaPlayer != null && isPlaying) {
            try {
                mediaPlayer.pause();
                currentPositionMs = mediaPlayer.getCurrentPosition();
            } catch (Exception ignored) {}
        }
        isPlaying = false;
        abandonAudioFocus();
        updateMediaSessionStateAndMetadata();
        updateNotification();
        notifyWebViewPlaybackSync("pause", currentPositionMs, currentDurationMs);
    }

    public void resumeDeviceAudio() {
        if (mediaPlayer != null) {
            requestAudioFocus();
            try {
                mediaPlayer.start();
                currentPositionMs = mediaPlayer.getCurrentPosition();
                currentDurationMs = mediaPlayer.getDuration();
                isPlaying = true;
            } catch (Exception e) {
                try {
                    mediaPlayer.prepareAsync();
                    isPlaying = true;
                } catch (Exception ignored) {}
            }
        }
        updateMediaSessionStateAndMetadata();
        updateNotification();
        notifyWebViewPlaybackSync("play", currentPositionMs, currentDurationMs);
    }

    public void seekDeviceAudio(long posMs) {
        currentPositionMs = Math.max(0, posMs);
        if (mediaPlayer != null) {
            try {
                mediaPlayer.seekTo((int) posMs);
            } catch (Exception ignored) {}
        }
        updateMediaSessionStateAndMetadata();
        updateNotification();
    }

    public void stopDeviceAudio() {
        if (mediaPlayer != null) {
            try {
                mediaPlayer.stop();
                mediaPlayer.reset();
            } catch (Exception ignored) {}
        }
        isPlaying = false;
        abandonAudioFocus();
        updateMediaSessionStateAndMetadata();
        updateNotification();
    }

    public void setNativeDeviceQueue(String queueJsonStr, int startIndex, boolean isShuffle, String repeatMode) {
        try {
            nativeDeviceQueue.clear();
            JSONArray arr = new JSONArray(queueJsonStr);
            for (int i = 0; i < arr.length(); i++) {
                nativeDeviceQueue.add(arr.getJSONObject(i));
            }
            nativeDeviceQueueIndex = Math.max(0, Math.min(startIndex, nativeDeviceQueue.size() - 1));
            nativeDeviceShuffle = isShuffle;
            nativeDeviceRepeatMode = repeatMode != null ? repeatMode : "all";
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void playNextDeviceTrack() {
        if (nativeDeviceQueue.isEmpty()) return;

        if ("one".equals(nativeDeviceRepeatMode)) {
            seekDeviceAudio(0);
            resumeDeviceAudio();
            return;
        }

        if (nativeDeviceQueueIndex < nativeDeviceQueue.size() - 1) {
            nativeDeviceQueueIndex++;
            playDeviceTrackNative(nativeDeviceQueue.get(nativeDeviceQueueIndex), true);
            notifyWebViewPlaybackSync("trackChange", 0, currentDurationMs);
        } else {
            if ("all".equals(nativeDeviceRepeatMode)) {
                nativeDeviceQueueIndex = 0;
                playDeviceTrackNative(nativeDeviceQueue.get(0), true);
                notifyWebViewPlaybackSync("trackChange", 0, currentDurationMs);
            } else {
                pauseDeviceAudio();
                seekDeviceAudio(0);
            }
        }
    }

    public void playPreviousDeviceTrack() {
        if (nativeDeviceQueue.isEmpty()) return;

        if (mediaPlayer != null && mediaPlayer.getCurrentPosition() > 3000) {
            seekDeviceAudio(0);
            return;
        }

        if (nativeDeviceQueueIndex > 0) {
            nativeDeviceQueueIndex--;
            playDeviceTrackNative(nativeDeviceQueue.get(nativeDeviceQueueIndex), true);
            notifyWebViewPlaybackSync("trackChange", 0, currentDurationMs);
        } else {
            if ("all".equals(nativeDeviceRepeatMode)) {
                nativeDeviceQueueIndex = nativeDeviceQueue.size() - 1;
                playDeviceTrackNative(nativeDeviceQueue.get(nativeDeviceQueueIndex), true);
                notifyWebViewPlaybackSync("trackChange", 0, currentDurationMs);
            } else {
                seekDeviceAudio(0);
            }
        }
    }

    private void handleNativeTrackCompletion() {
        if ("one".equals(nativeDeviceRepeatMode)) {
            seekDeviceAudio(0);
            resumeDeviceAudio();
        } else {
            playNextDeviceTrack();
        }
    }

    public static void notifyWebViewPlaybackSync(String action, long positionMs, long durationMs) {
        MainActivity activity = MainActivity.getInstance();
        if (activity != null && activity.getBridge() != null && activity.getBridge().getWebView() != null) {
            activity.runOnUiThread(() -> {
                try {
                    String js = "window.dispatchEvent(new CustomEvent('native-playback-sync', { detail: { action: '" + action + "', position: " + (positionMs / 1000.0) + ", duration: " + (durationMs / 1000.0) + " } }));";
                    activity.getBridge().getWebView().evaluateJavascript(js, null);
                } catch (Exception ignored) {}
            });
        }
    }

    public String getPlaybackStateJson() {
        JSONObject obj = new JSONObject();
        try {
            obj.put("activeSource", activePlaybackSource);
            obj.put("isPlaying", isPlaying);
            long pos = currentPositionMs;
            long dur = currentDurationMs;
            if ("device".equals(activePlaybackSource) && mediaPlayer != null) {
                try {
                    pos = mediaPlayer.getCurrentPosition();
                    dur = mediaPlayer.getDuration();
                } catch (Exception ignored) {}
            }
            obj.put("currentTime", pos / 1000.0);
            obj.put("duration", dur > 0 ? (dur / 1000.0) : 0);
            obj.put("currentTrack", currentDeviceTrack != null ? currentDeviceTrack : JSONObject.NULL);
            obj.put("queueIndex", nativeDeviceQueueIndex);
            obj.put("isShuffle", nativeDeviceShuffle);
            obj.put("repeatMode", nativeDeviceRepeatMode);

            JSONArray qArr = new JSONArray();
            for (JSONObject t : nativeDeviceQueue) {
                qArr.put(t);
            }
            obj.put("queue", qArr);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return obj.toString();
    }

    private void saveSessionToPrefs() {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.putString("activeSource", activePlaybackSource);
            editor.putString("title", currentTitle);
            editor.putString("artist", currentArtist);
            editor.putString("album", currentAlbum);
            editor.putString("coverUrl", currentCoverUrl);
            editor.putLong("duration", currentDurationMs);
            editor.putLong("position", currentPositionMs);
            editor.putBoolean("isPlaying", isPlaying);
            editor.apply();
        } catch (Exception ignored) {}
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);
        if ("device".equals(activePlaybackSource) && isPlaying) {
            // Local device music MUST survive swiping MUSE away from Recents!
            // Do NOT stop foreground service or release wake lock.
            acquireWakeLock();
            updateNotification();
        } else {
            // YouTube playback or stopped state: persist session cleanly
            saveSessionToPrefs();
            if (!isPlaying) {
                stopForeground(true);
                stopSelf();
            }
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_STOP.equals(action)) {
                if (mediaSession != null) {
                    mediaSession.setActive(false);
                }
                stopDeviceAudio();
                stopForeground(true);
                stopSelf();
                return START_NOT_STICKY;
            } else if (ACTION_TOGGLE.equals(action)) {
                if ("device".equals(activePlaybackSource)) {
                    if (isPlaying) {
                        pauseDeviceAudio();
                    } else {
                        resumeDeviceAudio();
                    }
                } else {
                    if (isPlaying) {
                        MainActivity.dispatchMediaAction("pause");
                    } else {
                        MainActivity.dispatchMediaAction("play");
                    }
                }
                return START_STICKY;
            } else if (ACTION_NEXT.equals(action)) {
                if ("device".equals(activePlaybackSource)) {
                    playNextDeviceTrack();
                } else {
                    MainActivity.dispatchMediaAction("next");
                }
                return START_STICKY;
            } else if (ACTION_PREV.equals(action)) {
                if ("device".equals(activePlaybackSource)) {
                    playPreviousDeviceTrack();
                } else {
                    MainActivity.dispatchMediaAction("previous");
                }
                return START_STICKY;
            } else if (ACTION_PLAY_DEVICE.equals(action)) {
                activePlaybackSource = "device";
                String queueJson = intent.getStringExtra("queueJson");
                int queueIndex = intent.getIntExtra("queueIndex", 0);
                boolean isShuffle = intent.getBooleanExtra("isShuffle", false);
                String repeatMode = intent.getStringExtra("repeatMode");
                if (queueJson != null) {
                    setNativeDeviceQueue(queueJson, queueIndex, isShuffle, repeatMode);
                }
                String trackJson = intent.getStringExtra("trackJson");
                if (trackJson != null) {
                    try {
                        playDeviceTrackNative(new JSONObject(trackJson), true);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
                return START_STICKY;
            } else if (ACTION_PAUSE_DEVICE.equals(action)) {
                pauseDeviceAudio();
                return START_STICKY;
            } else if (ACTION_RESUME_DEVICE.equals(action)) {
                resumeDeviceAudio();
                return START_STICKY;
            } else if (ACTION_SEEK_DEVICE.equals(action)) {
                long pos = intent.getLongExtra("position", 0);
                seekDeviceAudio(pos);
                return START_STICKY;
            }

            // Safely forward hardware media button events to MediaSession
            try {
                MediaButtonReceiver.handleIntent(mediaSession, intent);
            } catch (Exception e) {
                e.printStackTrace();
            }

            String source = intent.getStringExtra("source");
            if (source != null) {
                activePlaybackSource = source;
            }

            String title = intent.getStringExtra("title");
            String artist = intent.getStringExtra("artist");
            String album = intent.getStringExtra("album");
            String coverUrl = intent.getStringExtra("coverUrl");
            long duration = intent.getLongExtra("duration", currentDurationMs);
            long currentTime = intent.getLongExtra("currentTime", currentPositionMs);
            boolean playing = intent.getBooleanExtra("isPlaying", isPlaying);
            long mediaStoreId = intent.getLongExtra("mediaStoreId", 0);
            long albumId = intent.getLongExtra("albumId", 0);

            if (title != null && !title.isEmpty()) {
                currentTitle = title;
            }
            if (artist != null) {
                currentArtist = artist;
            }
            if (album != null) {
                currentAlbum = album;
            }
            currentDurationMs = duration;
            currentPositionMs = currentTime;
            isPlaying = playing;
            if (mediaStoreId > 0) currentMediaStoreId = mediaStoreId;
            if (albumId > 0) currentAlbumId = albumId;

            if (coverUrl != null && !coverUrl.equals(currentCoverUrl)) {
                currentCoverUrl = coverUrl;
                loadCoverArtAsync(coverUrl, currentMediaStoreId, currentAlbumId);
            }
        }

        updateMediaSessionStateAndMetadata();
        startAsForegroundService();

        return START_STICKY;
    }

    private void startAsForegroundService() {
        Notification notification = buildMediaNotification();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void updateMediaSessionStateAndMetadata() {
        if (mediaSession == null) return;

        long actions = PlaybackStateCompat.ACTION_PLAY |
                       PlaybackStateCompat.ACTION_PAUSE |
                       PlaybackStateCompat.ACTION_PLAY_PAUSE |
                       PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
                       PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS |
                       PlaybackStateCompat.ACTION_SEEK_TO |
                       PlaybackStateCompat.ACTION_STOP;

        int state = isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;
        float speed = isPlaying ? 1.0f : 0.0f;

        long pos = currentPositionMs;
        if ("device".equals(activePlaybackSource) && mediaPlayer != null) {
            try {
                pos = mediaPlayer.getCurrentPosition();
            } catch (Exception ignored) {}
        }

        PlaybackStateCompat playbackState = new PlaybackStateCompat.Builder()
                .setActions(actions)
                .setState(state, pos, speed, SystemClock.elapsedRealtime())
                .build();
        mediaSession.setPlaybackState(playbackState);

        MediaMetadataCompat.Builder metaBuilder = new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
                .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, currentAlbum)
                .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, currentDurationMs);

        if (cachedCoverBitmap != null) {
            metaBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, cachedCoverBitmap);
            metaBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ART, cachedCoverBitmap);
        }
        mediaSession.setMetadata(metaBuilder.build());
    }

    private Notification buildMediaNotification() {
        Intent contentIntent = new Intent(this, MainActivity.class);
        contentIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentPendingIntent = PendingIntent.getActivity(
                this, 0, contentIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent prevIntent = new Intent(this, MusicForegroundService.class);
        prevIntent.setAction(ACTION_PREV);
        PendingIntent prevPending = PendingIntent.getService(
                this, 1, prevIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent playPauseIntent = new Intent(this, MusicForegroundService.class);
        playPauseIntent.setAction(ACTION_TOGGLE);
        PendingIntent playPausePending = PendingIntent.getService(
                this, 2, playPauseIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent nextIntent = new Intent(this, MusicForegroundService.class);
        nextIntent.setAction(ACTION_NEXT);
        PendingIntent nextPending = PendingIntent.getService(
                this, 3, nextIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        int playPauseIcon = isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play;
        String playPauseText = isPlaying ? "Pause" : "Play";

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(currentTitle)
                .setContentText(currentArtist)
                .setSubText(currentAlbum != null && !currentAlbum.isEmpty() ? currentAlbum : "MUSE")
                .setContentIntent(contentPendingIntent)
                .setOngoing(isPlaying)
                .setOnlyAlertOnce(true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .addAction(android.R.drawable.ic_media_previous, "Previous", prevPending)
                .addAction(playPauseIcon, playPauseText, playPausePending)
                .addAction(android.R.drawable.ic_media_next, "Next", nextPending);

        if (cachedCoverBitmap != null) {
            builder.setLargeIcon(cachedCoverBitmap);
        }

        if (mediaSession != null) {
            MediaStyle mediaStyle = new MediaStyle()
                    .setMediaSession(mediaSession.getSessionToken())
                    .setShowActionsInCompactView(0, 1, 2);
            builder.setStyle(mediaStyle);
        }

        return builder.build();
    }

    private void updateNotification() {
        try {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.notify(NOTIFICATION_ID, buildMediaNotification());
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void loadCoverArtAsync(final String urlString, final long mediaStoreId, final long albumId) {
        if ((urlString == null || urlString.isEmpty()) && mediaStoreId <= 0 && albumId <= 0) {
            cachedCoverBitmap = null;
            updateMediaSessionStateAndMetadata();
            updateNotification();
            return;
        }

        imageExecutor.execute(() -> {
            try {
                Bitmap raw = null;

                // 1. Android 10+ (API 29+) Scoped Storage ContentResolver.loadThumbnail
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && mediaStoreId > 0) {
                    try {
                        Uri trackUri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, mediaStoreId);
                        raw = getContentResolver().loadThumbnail(trackUri, new Size(512, 512), null);
                    } catch (Exception ignored) {}
                }

                // 2. Base64 Data URI
                if (raw == null && urlString != null && urlString.startsWith("data:image/")) {
                    try {
                        int commaIdx = urlString.indexOf(',');
                        if (commaIdx != -1) {
                            String b64 = urlString.substring(commaIdx + 1);
                            byte[] decoded = Base64.decode(b64, Base64.DEFAULT);
                            raw = BitmapFactory.decodeByteArray(decoded, 0, decoded.length);
                        }
                    } catch (Exception ignored) {}
                }

                // 3. Content URI openInputStream
                if (raw == null && urlString != null && urlString.startsWith("content://")) {
                    try (InputStream input = getContentResolver().openInputStream(Uri.parse(urlString))) {
                        if (input != null) {
                            raw = BitmapFactory.decodeStream(input);
                        }
                    } catch (Exception ignored) {}
                }

                // 4. Fallback albumId content URI on older Android
                if (raw == null && albumId > 0) {
                    try {
                        Uri albumArtUri = ContentUris.withAppendedId(Uri.parse("content://media/external/audio/albumart"), albumId);
                        try (InputStream input = getContentResolver().openInputStream(albumArtUri)) {
                            if (input != null) {
                                raw = BitmapFactory.decodeStream(input);
                            }
                        }
                    } catch (Exception ignored) {}
                }

                // 5. HTTP / HTTPS URL (YouTube cover art)
                if (raw == null && urlString != null && (urlString.startsWith("http://") || urlString.startsWith("https://"))) {
                    try {
                        URL url = new URL(urlString);
                        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                        connection.setDoInput(true);
                        connection.setConnectTimeout(4000);
                        connection.setReadTimeout(4000);
                        connection.connect();
                        try (InputStream input = connection.getInputStream()) {
                            raw = BitmapFactory.decodeStream(input);
                        }
                    } catch (Exception ignored) {}
                }

                if (raw != null) {
                    int width = raw.getWidth();
                    int height = raw.getHeight();
                    int maxDim = 512;
                    if (width > maxDim || height > maxDim) {
                        float ratio = Math.min((float) maxDim / width, (float) maxDim / height);
                        int targetW = Math.max(1, Math.round(width * ratio));
                        int targetH = Math.max(1, Math.round(height * ratio));
                        cachedCoverBitmap = Bitmap.createScaledBitmap(raw, targetW, targetH, true);
                    } else {
                        cachedCoverBitmap = raw;
                    }
                } else {
                    cachedCoverBitmap = null;
                }
                updateMediaSessionStateAndMetadata();
                updateNotification();
            } catch (Exception e) {
                cachedCoverBitmap = null;
                updateMediaSessionStateAndMetadata();
                updateNotification();
            }
        });
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "MUSE Audio Playback",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Background audio controls and notifications");
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        if (mediaPlayer != null) {
            try {
                mediaPlayer.release();
            } catch (Exception ignored) {}
            mediaPlayer = null;
        }
        abandonAudioFocus();
        releaseWakeLock();
        if (imageExecutor != null && !imageExecutor.isShutdown()) {
            imageExecutor.shutdown();
        }
        if (instance == this) {
            instance = null;
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
