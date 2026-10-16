package com.muse.music;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
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
            IntentFilter filter = new IntentFilter(Intent.ACTION_SCREEN_OFF);
            androidx.core.content.ContextCompat.registerReceiver(
                this,
                screenOffReceiver,
                filter,
                androidx.core.content.ContextCompat.RECEIVER_NOT_EXPORTED
            );
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        keepWebViewAlive();
    }

    @Override
    public void onStop() {
        super.onStop();
        keepWebViewAlive();
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
        public void playTrack(String title, String artist, boolean isPlaying) {
            try {
                Intent intent = new Intent(context, MusicForegroundService.class);
                intent.setAction(MusicForegroundService.ACTION_UPDATE);
                intent.putExtra("title", title);
                intent.putExtra("artist", artist);
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
