# Gemi Android Developer Setup

Gemi is not an Expo Go-only app. It uses Expo + React Native with a custom Android native module for the local GGUF model, so developers must build the Android app locally.

## Before You Start

- Use JDK 17.
- Install Android Studio.
- Clone outside OneDrive, Dropbox, Google Drive, or iCloud.
- Clone with Git submodules.
- Do not use Expo Go. It cannot load the custom native Android module.

## Required Tools

| Tool | Required version / note |
| --- | --- |
| Git | Required |
| Node.js | Node.js 20 LTS recommended, Node 18+ accepted |
| JDK | JDK 17 |
| Android Studio | Latest stable is fine |
| Android SDK Platform | 36 |
| Android SDK Build-Tools | 36.0.0 |
| Android SDK Platform-Tools | Required |
| Android SDK Command-line Tools | Required |
| NDK Side by side | 27.1.12297006 |
| CMake | 3.22.1 |

## Quick Setup

1. Install the required tools.

   Install Git, Node.js, JDK 17, Android Studio, and the Android SDK packages listed above.

2. Clone the repository correctly.

   ```bash
   git clone --recurse-submodules <repository_url>
   cd soft-eng-2-project
   ```

   llama.cpp is stored as a Git submodule. The Android native build will fail if the submodule is missing.

   If you already cloned without submodules, run this from the repository root:

   ```bash
   git submodule update --init --recursive
   ```

3. Configure the Android SDK path.

   On Windows, create this file:

   ```text
   frontend/android/local.properties
   ```

   Add your SDK path:

   ```properties
   sdk.dir=C:\\Users\\<YourUsername>\\AppData\\Local\\Android\\Sdk
   ```

   macOS note:

   ```properties
   sdk.dir=/Users/<YourUsername>/Library/Android/sdk
   ```

4. Install frontend dependencies.

   ```bash
   cd frontend
   npm install
   ```

   Run `npm install` inside `frontend/`, not from the repository root.

5. Add the GGUF model.

   Download the model from the team shared drive:

   ```text
   qwen2.5-3b-instruct-q4_k_m.gguf
   ```

   Default Windows location:

   ```text
   C:\Users\<YourUsername>\Downloads\qwen2.5-3b-instruct-q4_k_m.gguf
   ```

   Default macOS location:

   ```text
   /Users/<YourUsername>/Downloads/qwen2.5-3b-instruct-q4_k_m.gguf
   ```

   `npm run android` automatically copies the model into:

   ```text
   frontend/android/app/src/main/assets/models/
   ```

   Optional custom model path on Windows PowerShell:

   ```powershell
   $env:LFM_MODEL_PATH="D:\Models\qwen2.5-3b-instruct-q4_k_m.gguf"
   ```

   Alternative filename from Downloads:

   ```powershell
   $env:LFM_MODEL_FILE="qwen2.5-3b-instruct-q4_k_m.gguf"
   ```

6. Start an Android emulator or connect a physical Android device with USB debugging enabled.

7. Run the app.

   ```bash
   npm run android
   ```

   This bundles the model, builds the Android app, installs it, and opens it.

## Useful Commands

| Command | Purpose |
| --- | --- |
| `npm run android` | Bundle model, build, install, and run Android app |
| `npm run start` | Start Metro only |
| `npm run patch:android` | Restore copied native Android module files if needed |
| `npm run prebuild` | Safely regenerate Android project and reapply native patch |
| `git submodule update --init --recursive` | Restore missing llama.cpp submodule |

## Common Fixes

### Java version error

Run:

```bash
java -version
```

Use JDK 17.

### SDK location not found

Create `frontend/android/local.properties` with the correct `sdk.dir` path.

### Missing Android SDK package

Open Android Studio SDK Manager and install the exact SDK, Build-Tools, NDK, or CMake version shown in the Gradle error.

### llama.cpp or CMake source path error

Run:

```bash
git submodule update --init --recursive
```

### Model file not found

Put `qwen2.5-3b-instruct-q4_k_m.gguf` in Downloads or set `LFM_MODEL_PATH` / `LFM_MODEL_FILE`.

### Build fails inside OneDrive or another cloud folder

Move the project to a local folder such as:

```text
C:\Projects\soft-eng-2-project
```

### Corrupted Gradle cache

From `frontend/`, run:

```powershell
.\android\gradlew.bat clean
npm run android
```

macOS/Linux:

```bash
./android/gradlew clean
npm run android
```

## Important Rules

- Do not use Expo Go.
- Do not clone inside a cloud-synced folder.
- Do not forget `--recurse-submodules`.
- Do not run `npm install` from the repository root.
- Do not commit the GGUF model file.
- Do not run raw `npx expo prebuild --clean`.
- Use `npm run prebuild` only when native regeneration is truly needed.

## Fresh Machine Checklist

1. Install Git.
2. Install Node.js 20 LTS.
3. Install JDK 17.
4. Install Android Studio and required SDK packages.
5. Clone with `--recurse-submodules`.
6. Configure `local.properties`.
7. Run `cd frontend` and `npm install`.
8. Add the GGUF model.
9. Start emulator or connect device.
10. Run `npm run android`.

If setup still fails, send the first actual error line from the terminal, not only the final `BUILD FAILED` line.
