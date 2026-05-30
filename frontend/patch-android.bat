@echo off
REM Restore LFM module files after Expo prebuild (Windows version)

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "LFM_SOURCE=%SCRIPT_DIR%native-modules\llm"
set "ANDROID_TARGET=%SCRIPT_DIR%android\app\src\main\java\com\anonymous\frontend\llm"

if not exist "%ANDROID_TARGET%" (
    mkdir "%ANDROID_TARGET%"
    echo Created directory: %ANDROID_TARGET%
)

copy /Y "%LFM_SOURCE%\LfmModule.kt" "%ANDROID_TARGET%\LfmModule.kt"
copy /Y "%LFM_SOURCE%\LfmPackage.kt" "%ANDROID_TARGET%\LfmPackage.kt"
copy /Y "%LFM_SOURCE%\LlamaBridge.kt" "%ANDROID_TARGET%\LlamaBridge.kt"

echo.
echo ✓ Restored LFM files to android/
echo.
echo Next steps:
echo 1. Register LfmPackage in MainApplication.kt
echo 2. Verify CMake build configuration in android/app/build.gradle
echo 3. Place LFM model at: android/app/src/main/assets/models/lfm2.5-1.2b-instruct-q4_k_m.gguf
echo.
