@echo off
REM Restore Gemma module files after Expo prebuild (Windows version)

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "GEMMA_SOURCE=%SCRIPT_DIR%native-modules\gemma"
set "ANDROID_TARGET=%SCRIPT_DIR%android\app\src\main\java\com\anonymous\frontend\gemma"

if not exist "%ANDROID_TARGET%" (
    mkdir "%ANDROID_TARGET%"
    echo Created directory: %ANDROID_TARGET%
)

copy /Y "%GEMMA_SOURCE%\GemmaModule.kt" "%ANDROID_TARGET%\GemmaModule.kt"
copy /Y "%GEMMA_SOURCE%\GemmaPackage.kt" "%ANDROID_TARGET%\GemmaPackage.kt"

echo.
echo ✓ Restored Gemma files to android/
echo.
echo Next steps:
echo 1. Register GemmaPackage in MainApplication.kt
echo 2. Add dependency to android/app/build.gradle:
echo    implementation "com.google.mediapipe:tasks-genai:0.10.14"
echo 3. Place Gemma model at: android/app/src/main/assets/gemma4-e2b.bin
echo.
