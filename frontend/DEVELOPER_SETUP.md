# 🚀 Developer Setup Guide

Welcome to the frontend project! This React Native/Expo app utilizes a massive local AI model (**Gemma**) via a custom native Android module. Because of this integration, the setup process diverges significantly from standard Expo projects.

> ⚠️ **CRITICAL:** Please read this entire guide *before* running any commands. Skipping steps will result in failed builds, missing dependencies, or corrupted native code.

## 📋 Prerequisites
Before you begin, ensure you have the following installed on your Windows or Mac machine:
- **Node.js** (v18 or newer recommended)
- **Git**
- **Android Studio** (with the Android SDK, Android SDK Command-line Tools, and NDK installed)
- **Java Development Kit (JDK)** 17

---

## 🛠️ Step 1: Clone the Repository

Clone the repository to your local machine.

> ⚠️ **WARNING: CLOUD SYNC NIGHTMARE**
> You **MUST NOT** clone or place this project folder inside a cloud-synced directory (e.g., Microsoft OneDrive, Dropbox, Google Drive, or iCloud).
>
> **Why?** Cloud syncing applications lock temporary build files while they upload. When the Kotlin compiler attempts to write to these files, it will crash mid-build with errors like:
> `Task :expo-log-box:compileDebugKotlin FAILED`
> Always clone to a purely local path (e.g., `C:\Projects\soft-eng-2-project` or `~/Projects/soft-eng-2-project`).

```bash
git clone <repository_url>
cd soft-eng-2-project/frontend
```

---

## 📦 Step 2: Install Node Dependencies

Install the project dependencies using npm:

```bash
npm install
```

---

## 🤖 Step 3: The Local AI Model (The 2.4GB File)

Our application relies on the Gemma AI model (`gemma-4-E2B-it.litertlm`). Because this file is approximately 2.4GB, it exceeds GitHub's file size limits and is specifically **ignored in `.gitignore`**.

If you attempt to build the Android app without this model, the app will crash when attempting to load the LLM.

**How to set this up:**
1. Download the `gemma-4-E2B-it.litertlm` file from our team's secure storage or shared drive.
2. Manually navigate to the following directory in your project:
   `android/app/src/main/assets/models/`
   *(Create the `models` folder if it does not exist).*
3. Place the `gemma-4-E2B-it.litertlm` file exactly in that directory.

---

## ⚙️ Step 4: Configure Android SDK

Git does not track the `local.properties` file because absolute paths differ between developers' machines. You must configure your Android SDK path or you will encounter the **"SDK location not found"** error.

**Option A: Create `local.properties` manually**
1. In the `frontend/android/` directory, create a new file named `local.properties`.
2. Add your SDK path to the file.
   - **Windows:** `sdk.dir=C\:\\Users\\<YourUsername>\\AppData\\Local\\Android\\Sdk`
   - **Mac:** `sdk.dir=/Users/<YourUsername>/Library/Android/sdk`

**Option B: Set System Environment Variables (Recommended)**
Ensure your `ANDROID_HOME` system environment variable is correctly pointed to your SDK path, and that you have restarted your terminal after setting it.

---

## 🛑 Step 5: The Bare Workflow Warning

We use a custom Android module (`android/app/src/main/java/com/anonymous/frontend/gemma/`) to interface with the LiteRT LM library.

> ⚠️ **CRITICAL WARNING:**
> The `android/` folder is actively tracked in Git because of our custom Gemma module.
>
> You must **NEVER** run `npx expo prebuild --clean`.
> Running this command will completely wipe the `android/` folder, destroying our custom native code and irreparably breaking the app's AI integration.

If you ever need to patch or regenerate other native modules, use the standard `npm run android` which safely handles prebuilding, or use our custom `npm run prebuild` / `npm run patch:android` scripts defined in `package.json`.

---

## 🧩 Step 6: Kotlin & NDK Dependencies

To successfully compile the local AI module (`litertlm-android:0.12.0`), our Gradle files enforce specific build configurations:

- **NDK Version:** Ensure your NDK version matches the one implicitly required by the React Native version (`rootProject.ext.ndkVersion`). You can install the default NDK version via Android Studio's SDK Manager.
- **Kotlin Metadata Mismatch:** We are currently utilizing `-Xskip-metadata-version-check` in our Kotlin compiler options. This bypasses a LiteRT metadata version mismatch (we enforce Kotlin `2.2.0` while `litertlm` expects `2.3.0`).
> ⚠️ **IMPORTANT:** If you encounter Kotlin compiler errors, **do not** try to globally bump the React Native Kotlin version in `android/build.gradle`. Our current overrides (`kotlinVersion = "2.2.0"`, `kspVersion = "2.2.0-2.0.2"`) are intentionally pinned to maintain compatibility with Expo SDK 56.

---

## ▶️ Step 7: Running the App

Once you have completed all the steps above, you are ready to build and run the application!

Start the Metro bundler and compile the Android app using our custom script (which automatically triggers `bundle:model` to verify the asset):

```bash
npm run android
```

If everything is configured properly, the app will compile, install onto your connected emulator or physical Android device, and load the Gemma model successfully.

🎉 **Happy Coding!**
