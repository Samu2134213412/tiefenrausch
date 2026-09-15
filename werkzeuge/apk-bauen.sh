#!/usr/bin/env bash
# Baut die Android-App als installierbare APK.
#
# Voraussetzung: Android SDK (kommt mit Android Studio) und ein JDK.
# Ergebnis: android/app/build/outputs/apk/debug/app-debug.apk
set -e

cd "$(dirname "$0")/.."

export ANDROID_HOME="${ANDROID_HOME:-$LOCALAPPDATA/Android/Sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"

echo "Web-Dateien in das Android-Projekt kopieren ..."
npx cap sync android

echo "APK bauen ..."
cd android
./gradlew assembleDebug

APK="app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK" ]; then
  echo ""
  echo "Fertig: android/$APK"
  echo "Auf ein angeschlossenes Handy übertragen mit:"
  echo "  \"\$ANDROID_HOME/platform-tools/adb\" install -r android/$APK"
else
  echo "APK wurde nicht erzeugt." >&2
  exit 1
fi
