# Developer Setup Guide

This is the setup guide for the Gemi frontend app.

The app is not a normal Expo Go-only project. It uses Expo + React Native with a custom native Android module for the local LFM/llama.cpp model, so every developer must build the native Android app locally.

Read this once before running commands. Most setup errors come from using the wrong Java version, missing Android SDK packages, cloning without submodules, or building inside OneDrive.

## Project Versions

Use these versions unless the project is upgraded later:

| Tool | Required version / note |
| --- | --- |
| Node.js | 18 or newer, Node 20 LTS recommended |
| npm | bundled with Node |
| Java / JDK | JDK 17 exactly recommended |
| Android Studio | Latest stable is fine |
| Expo | SDK 56, from `package.json` |
| React Native | 0.85.3 |
| Kotlin | 2.2.0, pinned in `android/build.gradle` |
| Gradle | 9.3.1, from `android/gradle/wrapper` |

Important: when someone says “SDK 17,” this project usually means **JDK 17**, not Android SDK API 17.

## 1. Install Required Tools

Install these first:

1. Git
2. Node.js 20 LTS, or at least Node 18+
3. Android Studio
4. JDK 17

Recommended JDK on Windows:

```powershell
winget install EclipseAdoptium.Temurin.17.JDK
```

Check Java:

```bash
java -version
```

Good output should mention version `17.x`. If it shows Java 21, Java 22, or Java 8, fix `JAVA_HOME`.

Windows `JAVA_HOME` example:

```powershell
$env:JAVA_HOME="C:\Program Files\Eclipse Adoptium\jdk-17.0.x.x-hotspot"
$env:Path="$env:JAVA_HOME\bin;$env:Path"
java -version
```

For a permanent Windows setup, open:

```text
System Properties > Environment Variables
```

Set:

```text
JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17...
```

Add this to `Path`:

```text
%JAVA_HOME%\bin
```

Restart the terminal after changing environment variables.

## 2. Configure Android Studio

Open Android Studio, then go to:

```text
Settings > Languages & Frameworks > Android SDK
```

Install these from **SDK Platforms**:

- The Android SDK Platform requested by Gradle/Expo during build.
- If Android Studio shows “Install missing SDK package,” accept it.

Install these from **SDK Tools**:

- Android SDK Build-Tools
- Android SDK Platform-Tools
- Android SDK Command-line Tools, latest
- CMake
- NDK Side by side
- Android Emulator, if using an emulator

If Gradle says a specific SDK is missing, install the exact package shown in the error. Common examples look like:

```text
Failed to find Build Tools revision xx.x.x
Android SDK Platform xx not found
NDK at ... did not have a source.properties file
```

Do not guess. Open SDK Manager and install the exact missing SDK/build-tools/NDK version from the error.

## 3. Set Android Environment Variables

Android Studio usually installs the SDK here:

Windows:

```text
C:\Users\<YourUsername>\AppData\Local\Android\Sdk
```

macOS:

```text
/Users/<YourUsername>/Library/Android/sdk
```

Set `ANDROID_HOME` or create `frontend/android/local.properties`.

Option A, create `frontend/android/local.properties`:

Windows:

```properties
sdk.dir=C\:\\Users\\<YourUsername>\\AppData\\Local\\Android\\Sdk
```

macOS:

```properties
sdk.dir=/Users/<YourUsername>/Library/Android/sdk
```

Option B, environment variable:

Windows PowerShell:

```powershell
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:Path="$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"
```

macOS/Linux:

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

Verify:

```bash
adb version
```

If `adb` is not found, your SDK path is not configured correctly.

## 4. Clone the Repository Correctly

Do not clone inside OneDrive, Dropbox, Google Drive, iCloud, or any cloud-synced folder. Android/Kotlin builds often fail when cloud sync locks Gradle files.

Good Windows location:

```text
C:\Projects\soft-eng-2-project
```

Good macOS location:

```text
~/Projects/soft-eng-2-project
```

Clone with submodules:

```bash
git clone --recurse-submodules <repository_url>
cd soft-eng-2-project
```

If you already cloned without submodules, run:

```bash
git submodule update --init --recursive
```

This is required because llama.cpp lives here:

```text
frontend/native-modules/llama.cpp
```

If that folder is empty, the Android native build will fail.

## 5. Install Dependencies

From the frontend folder:

```bash
cd frontend
npm install
```

Do not run `npm install` from the repository root. The active frontend `package.json` is inside `frontend/`.

## 6. Add the Local AI Model

The app needs this model file:

```text
qwen2.5-3b-instruct-q4_k_m.gguf
```

This file is too large for Git and is intentionally ignored.

Default setup:

1. Download the model from the team shared drive.
2. Put it in your Downloads folder:

Windows:

```text
C:\Users\<YourUsername>\Downloads\qwen2.5-3b-instruct-q4_k_m.gguf
```

macOS:

```text
/Users/<YourUsername>/Downloads/qwen2.5-3b-instruct-q4_k_m.gguf
```

The build script will copy it automatically when you run:

```bash
npm run android
```

Custom model path:

Windows PowerShell:

```powershell
$env:LFM_MODEL_PATH="D:\Models\qwen2.5-3b-instruct-q4_k_m.gguf"
npm run android
```

macOS/Linux:

```bash
LFM_MODEL_PATH="/path/to/qwen2.5-3b-instruct-q4_k_m.gguf" npm run android
```

## 7. Patch Native Android Module

The app uses native files from:

```text
frontend/native-modules/llm
```

These are copied into:

```text
frontend/android/app/src/main/java/com/anonymous/frontend/llm
```

Normally you do not need to do this manually. The Android project already contains the copied files.

If the native package is missing after a prebuild, run:

```bash
npm run patch:android
```

Avoid running raw Expo prebuild commands. Use project scripts only.

## 8. Run the Android App

Start an emulator in Android Studio, or plug in a physical Android device with USB debugging enabled.

Then run:

```bash
npm run android
```

This command:

1. Checks/copies the GGUF model with `bundle:model`.
2. Builds the Android app.
3. Installs it on the emulator/device.

For Metro only:

```bash
npm run start
```

Expo Go will not run the custom native LFM module. Use `npm run android`.

## 9. Commands You Should Not Run

Do not run this unless the team agrees:

```bash
npx expo prebuild --clean
```

It can wipe native Android changes. If native regeneration is truly needed, use:

```bash
npm run prebuild
```

Then verify the LFM package is still registered in:

```text
frontend/android/app/src/main/java/com/anonymous/frontend/MainApplication.kt
```

## 10. Common Errors and Fixes

### `SDK location not found`

Create:

```text
frontend/android/local.properties
```

With your SDK path:

```properties
sdk.dir=C\:\\Users\\<YourUsername>\\AppData\\Local\\Android\\Sdk
```

### `Unsupported class file major version` or Java version errors

You are probably using the wrong Java version.

Run:

```bash
java -version
```

Use JDK 17.

### `Android SDK Platform xx not found`

Open Android Studio SDK Manager and install the platform version shown in the error.

Also install:

- SDK Build-Tools
- Platform-Tools
- Command-line Tools

### NDK or CMake errors

Open Android Studio SDK Manager > SDK Tools and install:

- NDK Side by side
- CMake

Then rebuild.

### `llama.cpp` or CMake source path errors

Your submodule is missing.

From the repo root:

```bash
git submodule update --init --recursive
```

Then confirm this folder has files:

```text
frontend/native-modules/llama.cpp
```

### `Model file not found`

Put the GGUF model in Downloads or set `LFM_MODEL_PATH`.

The expected filename is:

```text
qwen2.5-3b-instruct-q4_k_m.gguf
```

### Kotlin build failed inside OneDrive/Dropbox/iCloud

Move the project to a local folder like:

```text
C:\Projects\soft-eng-2-project
```

Then run:

```bash
cd frontend
npm install
npm run android
```

### Build cache seems corrupted

From `frontend/`:

Windows:

```powershell
.\android\gradlew.bat clean
npm run android
```

macOS/Linux:

```bash
./android/gradlew clean
npm run android
```

## 11. Quick Clean Setup Checklist

Use this checklist for a fresh machine:

1. Install Git.
2. Install Node.js 20 LTS.
3. Install JDK 17 and verify `java -version`.
4. Install Android Studio.
5. Install Android SDK Platform, Build-Tools, Platform-Tools, Command-line Tools, CMake, and NDK Side by side.
6. Set `ANDROID_HOME` or create `frontend/android/local.properties`.
7. Clone with `git clone --recurse-submodules <repository_url>`.
8. Run `cd frontend`.
9. Run `npm install`.
10. Put `qwen2.5-3b-instruct-q4_k_m.gguf` in Downloads or set `LFM_MODEL_PATH`.
11. Start emulator or connect Android device.
12. Run `npm run android`.

If it still fails, copy the first actual error line from the terminal, not just the final `BUILD FAILED` line.

