package com.muse.music;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.SystemClock;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;

import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;
import androidx.media.session.MediaButtonReceiver;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MusicForegroundService extends Service {
    public static final String CHANNEL_ID = "muse_playback_channel";
    public static final int NOTIFICATION_ID = 1001;

    public static final String ACTION_START = "com.muse.music.action.START";
    public static final String ACTION_UPDATE = "com.muse.music.action.UPDATE";
    public static final String ACTION_STOP = "com.muse.music.action.STOP";

    private MediaSessionCompat mediaSession;
    private PowerManager.WakeLock wakeLock;
    private final ExecutorService imageExecutor = Executors.newSingleThreadExecutor();

    private String currentTitle = "MUSE Track";
    private String currentArtist = "Playing Audio";
    private String currentAlbum = "MUSE";
    private String currentCoverUrl = "";
    private long currentDurationMs = 0;
    private long currentPositionMs = 0;
    private boolean isPlaying = false;
    private Bitmap cachedCoverBitmap = null;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        acquireWakeLock();
        initMediaSession();
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
                MainActivity.dispatchMediaAction("play");
            }

            @Override
            public void onPause() {
                super.onPause();
                MainActivity.dispatchMediaAction("pause");
            }

            @Override
            public void onSkipToNext() {
                super.onSkipToNext();
                MainActivity.dispatchMediaAction("next");
            }

            @Override
            public void onSkipToPrevious() {
                super.onSkipToPrevious();
                MainActivity.dispatchMediaAction("previous");
            }

            @Override
            public void onSeekTo(long pos) {
                super.onSeekTo(pos);
                currentPositionMs = pos;
                MainActivity.dispatchSeekAction(pos / 1000.0);
                updateMediaSessionStateAndMetadata();
            }

            @Override
            public void onStop() {
                super.onStop();
                MainActivity.dispatchMediaAction("pause");
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

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            // Forward hardware media button events to MediaSession
            MediaButtonReceiver.handleIntent(mediaSession, intent);

            String action = intent.getAction();
            if (ACTION_STOP.equals(action)) {
                if (mediaSession != null) {
                    mediaSession.setActive(false);
                }
                stopForeground(true);
                stopSelf();
                return START_NOT_STICKY;
            }

            String title = intent.getStringExtra("title");
            String artist = intent.getStringExtra("artist");
            String album = intent.getStringExtra("album");
            String coverUrl = intent.getStringExtra("coverUrl");
            long duration = intent.getLongExtra("duration", currentDurationMs);
            long currentTime = intent.getLongExtra("currentTime", currentPositionMs);
            boolean playing = intent.getBooleanExtra("isPlaying", isPlaying);

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

            if (coverUrl != null && !coverUrl.equals(currentCoverUrl)) {
                currentCoverUrl = coverUrl;
                loadCoverArtAsync(coverUrl);
            }
        }

        updateMediaSessionStateAndMetadata();

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

        return START_STICKY;
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

        PlaybackStateCompat playbackState = new PlaybackStateCompat.Builder()
                .setActions(actions)
                .setState(state, currentPositionMs, speed, SystemClock.elapsedRealtime())
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

        PendingIntent prevPending = MediaButtonReceiver.buildMediaButtonPendingIntent(
                this, PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
        );
        PendingIntent playPausePending = MediaButtonReceiver.buildMediaButtonPendingIntent(
                this, PlaybackStateCompat.ACTION_PLAY_PAUSE
        );
        PendingIntent nextPending = MediaButtonReceiver.buildMediaButtonPendingIntent(
                this, PlaybackStateCompat.ACTION_SKIP_TO_NEXT
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

    private void loadCoverArtAsync(final String urlString) {
        if (urlString == null || urlString.isEmpty() || !urlString.startsWith("http")) {
            cachedCoverBitmap = null;
            updateMediaSessionStateAndMetadata();
            updateNotification();
            return;
        }

        imageExecutor.execute(() -> {
            try {
                URL url = new URL(urlString);
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setDoInput(true);
                connection.setConnectTimeout(4000);
                connection.setReadTimeout(4000);
                connection.connect();
                InputStream input = connection.getInputStream();
                Bitmap raw = BitmapFactory.decodeStream(input);
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
                    updateMediaSessionStateAndMetadata();
                    updateNotification();
                }
            } catch (Exception e) {
                // Ignore image network errors; fallback gracefully
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
        releaseWakeLock();
        if (imageExecutor != null && !imageExecutor.isShutdown()) {
            imageExecutor.shutdown();
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
