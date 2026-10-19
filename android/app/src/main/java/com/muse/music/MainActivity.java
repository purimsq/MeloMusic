package com.muse.music;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.ContentUris;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import android.util.Size;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.BridgeActivity;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public class MainActivity extends BridgeActivity {
    public static final int REQUEST_STORAGE_PERMISSION = 102;
    private static MainActivity instance;
    private BroadcastReceiver screenOffReceiver;

    public static MainActivity getInstance() {
        return instance;
    }

    public static void dispatchMediaAction(final String action) {
        if (instance != null && instance.getBridge() != null && instance.getBridge().getWebView() != null) {
            instance.runOnUiThread(() -> {
                try {
                    String js = "window.dispatchEvent(new CustomEvent('native-media-action', { detail: { action: '" + action + "' } }));";
                    instance.getBridge().getWebView().evaluateJavascript(js, null);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }
    }

    public static void dispatchSeekAction(final double seconds) {
        if (instance != null && instance.getBridge() != null && instance.getBridge().getWebView() != null) {
            instance.runOnUiThread(() -> {
                try {
                    String js = "window.dispatchEvent(new CustomEvent('native-media-action', { detail: { action: 'seek', position: " + seconds + " } }));";
                    instance.getBridge().getWebView().evaluateJavascript(js, null);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        instance = this;

        // Request POST_NOTIFICATIONS for Android 13+ so Foreground Service & lockscreen controls can display
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }

        // Spotify-style background navigation: Pressing Back moves task to background without killing WebView or audio
        getOnBackPressedDispatcher().addCallback(this, new androidx.activity.OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                moveTaskToBack(true);
            }
        });

        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                settings.setMediaPlaybackRequiresUserGesture(false);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setJavaScriptEnabled(true);
                settings.setCacheMode(WebSettings.LOAD_DEFAULT);
                // Set Desktop Chrome User-Agent so YouTube runs full desktop player without mobile background pause restrictions
                settings.setUserAgentString("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36");

                // Inject Native Music Bridge for Dynamic Island & Foreground Service
                webView.addJavascriptInterface(new MusicBridge(this), "AndroidMusicBridge");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        registerScreenOffReceiver();
    }

    @Override
    public void onBackPressed() {
        // Prevent activity finish; keep music playing seamlessly in background
        moveTaskToBack(true);
    }

    private void registerScreenOffReceiver() {
        try {
            screenOffReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    if (Intent.ACTION_SCREEN_OFF.equals(intent.getAction())) {
                        keepWebViewAlive();
                    }
                }
            };
            IntentFilter filter = new IntentFilter();
            filter.addAction(Intent.ACTION_SCREEN_OFF);
            filter.addAction(Intent.ACTION_SCREEN_ON);
            filter.addAction(Intent.ACTION_USER_PRESENT);
            registerReceiver(screenOffReceiver, filter);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        keepWebViewAlive();
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().postDelayed(this::keepWebViewAlive, 100);
        }
    }

    @Override
    public void onStop() {
        super.onStop();
        keepWebViewAlive();
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().postDelayed(this::keepWebViewAlive, 100);
        }
    }

    private void keepWebViewAlive() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                webView.onResume();
                webView.resumeTimers();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public boolean hasStoragePermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return checkSelfPermission(Manifest.permission.READ_MEDIA_AUDIO) == PackageManager.PERMISSION_GRANTED;
        } else {
            return checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
        }
    }

    public void requestStoragePermission() {
        runOnUiThread(() -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                requestPermissions(new String[]{Manifest.permission.READ_MEDIA_AUDIO}, REQUEST_STORAGE_PERMISSION);
            } else {
                requestPermissions(new String[]{Manifest.permission.READ_EXTERNAL_STORAGE}, REQUEST_STORAGE_PERMISSION);
            }
        });
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_STORAGE_PERMISSION) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            boolean permanentlyDenied = false;
            if (!granted) {
                String perm = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                        ? Manifest.permission.READ_MEDIA_AUDIO
                        : Manifest.permission.READ_EXTERNAL_STORAGE;
                permanentlyDenied = !ActivityCompat.shouldShowRequestPermissionRationale(this, perm);
            }
            final String eventJs = "window.dispatchEvent(new CustomEvent('device-permission-result', { detail: { granted: " + granted + ", permanentlyDenied: " + permanentlyDenied + " } }));";
            if (getBridge() != null && getBridge().getWebView() != null) {
                runOnUiThread(() -> {
                    try {
                        getBridge().getWebView().evaluateJavascript(eventJs, null);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                });
            }
        }
    }

    @Override
    public void onDestroy() {
        if (screenOffReceiver != null) {
            try {
                unregisterReceiver(screenOffReceiver);
            } catch (Exception e) {}
        }
        instance = null;
        super.onDestroy();
    }

    public static class MusicBridge {
        private final Context context;

        public MusicBridge(Context context) {
            this.context = context;
        }

        @JavascriptInterface
        public boolean hasStoragePermission() {
            if (context instanceof MainActivity) {
                return ((MainActivity) context).hasStoragePermission();
            }
            return false;
        }

        @JavascriptInterface
        public void requestStoragePermission() {
            if (context instanceof MainActivity) {
                ((MainActivity) context).requestStoragePermission();
            }
        }

        @JavascriptInterface
        public void openAppSettings() {
            try {
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.fromParts("package", context.getPackageName(), null));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public String queryDeviceAudio() {
            JSONArray tracks = new JSONArray();
            Uri uri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
            String selection = MediaStore.Audio.Media.IS_MUSIC + " != 0";
            String[] projection = {
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.TITLE,
                MediaStore.Audio.Media.ARTIST,
                MediaStore.Audio.Media.ALBUM,
                MediaStore.Audio.Media.DURATION,
                MediaStore.Audio.Media.ALBUM_ID,
                MediaStore.Audio.Media.DATA
            };
            String sortOrder = MediaStore.Audio.Media.TITLE + " ASC";
            try (Cursor cursor = context.getContentResolver().query(uri, projection, selection, null, sortOrder)) {
                if (cursor != null) {
                    int idCol = cursor.getColumnIndex(MediaStore.Audio.Media._ID);
                    int titleCol = cursor.getColumnIndex(MediaStore.Audio.Media.TITLE);
                    int artistCol = cursor.getColumnIndex(MediaStore.Audio.Media.ARTIST);
                    int albumCol = cursor.getColumnIndex(MediaStore.Audio.Media.ALBUM);
                    int durCol = cursor.getColumnIndex(MediaStore.Audio.Media.DURATION);
                    int albumIdCol = cursor.getColumnIndex(MediaStore.Audio.Media.ALBUM_ID);
                    int dataCol = cursor.getColumnIndex(MediaStore.Audio.Media.DATA);

                    while (cursor.moveToNext()) {
                        long id = cursor.getLong(idCol);
                        String title = cursor.getString(titleCol);
                        String artist = cursor.getString(artistCol);
                        String album = cursor.getString(albumCol);
                        long durationMs = cursor.getLong(durCol);
                        long albumId = cursor.getLong(albumIdCol);
                        String data = dataCol != -1 ? cursor.getString(dataCol) : "";

                        Uri contentUri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id);
                        Uri artworkUri = ContentUris.withAppendedId(Uri.parse("content://media/external/audio/albumart"), albumId);

                        JSONObject track = new JSONObject();
                        track.put("id", "device-ms-" + id);
                        track.put("mediaStoreId", id);
                        track.put("albumId", albumId);
                        track.put("title", (title != null && !title.trim().isEmpty()) ? title : "Unknown Title");
                        track.put("artist", (artist != null && !artist.equals("<unknown>")) ? artist : "Device Music");
                        track.put("album", (album != null && !album.equals("<unknown>")) ? album : "Phone Storage");
                        track.put("duration", durationMs > 0 ? (int)(durationMs / 1000) : 210);
                        track.put("contentUri", contentUri.toString());
                        track.put("cover", artworkUri.toString());
                        track.put("filePath", data != null ? data : "");
                        track.put("source", "device");
                        track.put("isDeviceTrack", true);

                        tracks.put(track);
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
            return tracks.toString();
        }

        @JavascriptInterface
        public void playDeviceTrackNative(String trackJson, String queueJson, int queueIndex, boolean isShuffle, String repeatMode) {
            try {
                Intent intent = new Intent(context, MusicForegroundService.class);
                intent.setAction(MusicForegroundService.ACTION_PLAY_DEVICE);
                intent.putExtra("trackJson", trackJson);
                intent.putExtra("queueJson", queueJson);
                intent.putExtra("queueIndex", queueIndex);
                intent.putExtra("isShuffle", isShuffle);
                intent.putExtra("repeatMode", repeatMode);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent);
                } else {
                    context.startService(intent);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public void pauseDeviceAudio() {
            try {
                MusicForegroundService service = MusicForegroundService.getInstance();
                if (service != null) {
                    service.pauseDeviceAudio();
                } else {
                    Intent intent = new Intent(context, MusicForegroundService.class);
                    intent.setAction(MusicForegroundService.ACTION_PAUSE_DEVICE);
                    context.startService(intent);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public void resumeDeviceAudio() {
            try {
                MusicForegroundService service = MusicForegroundService.getInstance();
                if (service != null) {
                    service.resumeDeviceAudio();
                } else {
                    Intent intent = new Intent(context, MusicForegroundService.class);
                    intent.setAction(MusicForegroundService.ACTION_RESUME_DEVICE);
                    context.startService(intent);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public void seekDeviceAudio(double seconds) {
            try {
                MusicForegroundService service = MusicForegroundService.getInstance();
                if (service != null) {
                    service.seekDeviceAudio((long)(seconds * 1000));
                } else {
                    Intent intent = new Intent(context, MusicForegroundService.class);
                    intent.setAction(MusicForegroundService.ACTION_SEEK_DEVICE);
                    intent.putExtra("position", (long)(seconds * 1000));
                    context.startService(intent);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public String getNativePlaybackState() {
            try {
                MusicForegroundService service = MusicForegroundService.getInstance();
                if (service != null) {
                    return service.getPlaybackStateJson();
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
            return "{}";
        }

        @JavascriptInterface
        public void syncPlaybackSource(String source) {
            try {
                MusicForegroundService service = MusicForegroundService.getInstance();
                if (service != null) {
                    service.setActivePlaybackSource(source);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public String getAlbumArt(long trackId, long albumId) {
            try {
                Bitmap bitmap = null;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && trackId > 0) {
                    Uri trackUri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, trackId);
                    bitmap = context.getContentResolver().loadThumbnail(trackUri, new Size(300, 300), null);
                } else if (albumId > 0) {
                    Uri albumArtUri = ContentUris.withAppendedId(Uri.parse("content://media/external/audio/albumart"), albumId);
                    try (InputStream is = context.getContentResolver().openInputStream(albumArtUri)) {
                        if (is != null) {
                            bitmap = BitmapFactory.decodeStream(is);
                        }
                    } catch (Exception ignored) {}
                }
                if (bitmap != null) {
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    bitmap.compress(Bitmap.CompressFormat.JPEG, 85, baos);
                    byte[] bytes = baos.toByteArray();
                    return "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP);
                }
            } catch (Exception ignored) {}
            return "";
        }

        @JavascriptInterface
        public void playTrack(String title, String artist, boolean isPlaying) {
            updateState(title, artist, "MUSE", "", 0, 0, isPlaying);
        }

        @JavascriptInterface
        public void updateState(String title, String artist, String album, String coverUrl, double durationSec, double currentSec, boolean isPlaying) {
            try {
                Intent intent = new Intent(context, MusicForegroundService.class);
                intent.setAction(MusicForegroundService.ACTION_UPDATE);
                intent.putExtra("title", title);
                intent.putExtra("artist", artist);
                intent.putExtra("album", album);
                intent.putExtra("coverUrl", coverUrl);
                intent.putExtra("duration", (long)(durationSec * 1000));
                intent.putExtra("currentTime", (long)(currentSec * 1000));
                intent.putExtra("isPlaying", isPlaying);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent);
                } else {
                    context.startService(intent);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public void stopService() {
            try {
                Intent intent = new Intent(context, MusicForegroundService.class);
                context.stopService(intent);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }
}
