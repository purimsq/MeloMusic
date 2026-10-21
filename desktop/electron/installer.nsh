; Custom NSIS Uninstaller script for MUSE
; Purges all application data, Local Storage, cache, and preferences when uninstalled

!macro customUnInstall
  DetailPrint "Removing MUSE Local Storage and user application data..."
  RMDir /r "$APPDATA\MUSE"
  RMDir /r "$LOCALAPPDATA\MUSE"
  RMDir /r "$APPDATA\muse-desktop"
  RMDir /r "$LOCALAPPDATA\muse-desktop"
  RMDir /r "$APPDATA\com.purimsq.melomusic"
  RMDir /r "$LOCALAPPDATA\com.purimsq.melomusic"
!macroend
