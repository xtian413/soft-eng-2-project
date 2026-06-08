# Gemi Local Flow Model (LFM) Optimization & Troubleshooting Guide

This guide compiles all developer setup steps, optimization workflows, and common troubleshooting fixes encountered while testing local on-device AI inference within the Gemi application.

---

## 🛠 Compilation & Installation Fixes

### 1. NDK Version Mismatch (`[CXX1101]` Build Failure)
*   **Problem**: Gradle failed to compile the native `llama.cpp` C++ library because it was looking for an NDK version (`27.0.12077973`) that did not exist or was corrupted.
*   **Fix**: Modified the Gradle settings in `frontend/android/llama/build.gradle` to dynamically use the project's root NDK configuration:
    ```groovy
    android {
        // Force compiling with the root project's installed NDK version
        ndkVersion rootProject.ext.ndkVersion 
        ...
    }
    ```

### 2. Emulator Partition Exhaustion (`INSTALL_FAILED_INSUFFICIENT_STORAGE`)
*   **Problem**: Installing a 2GB+ APK containing the bundled GGUF model exceeded the emulator's default storage partition size.
*   **Fix**: Boot the Android Emulator from your terminal using an expanded partition limit (at least 8 GB):
    ```bash
    ~/Android/Sdk/emulator/emulator -avd <Your_AVD_Name> -partition-size 8192
    ```

### 3. SD Card Read Restrictions (`cp: Permission denied`)
*   **Problem**: Copying the GGUF model from `/sdcard/Download/` to the application sandbox using `run-as` failed because the sandboxed application user does not have permission to access external storage.
*   **Fix**: Pipe the model weights from the host shell into the app's sandboxed directory. This reads the file as the privileged `shell` user and writes it inside the sandbox:
    ```bash
    # Delete any corrupted/partial model file first
    adb shell run-as com.anonymous.frontend rm -f /data/user/0/com.anonymous.frontend/files/qwen2.5-3b-instruct-q4_k_m.gguf

    # Pipe the file from SD card to app sandbox via tee
    adb shell "cat /sdcard/Download/qwen2.5-3b-instruct-q4_k_m.gguf | run-as com.anonymous.frontend tee /data/user/0/com.anonymous.frontend/files/qwen2.5-3b-instruct-q4_k_m.gguf > /dev/null"

    # Reclaim SD card storage
    adb shell rm /sdcard/Download/qwen2.5-3b-instruct-q4_k_m.gguf
    ```

---

## 🚀 Accelerating Model Inference (Host-Bridge Setup)

Running a 3B model inside the emulator's virtual CPU causes severe latency (~85s generation time) and risks Out of Memory (OOM) app crashes. To use your laptop's **RTX GPU** natively during testing, we route model queries through the host-bridge.

### Step 1: Start the Local LLM Server on your Laptop (GPU-enabled)
*   **Using Ollama (Recommended)**:
    Install Ollama and run the model:
    ```bash
    curl -fsSL https://ollama.com/install.sh | sh
    ollama run qwen2.5:3b-instruct
    ```
*   **Using Native llama.cpp Server**:
    Start the server pointing to your local GGUF weights, offloading layers to the GPU:
    ```bash
    ./llama-server -m /media/jed/04906F4E906F4570/qwen2.5-3b-instruct-q4_k_m.gguf -ngl 32 --port 11434
    ```

### Step 2: Ensure Laptop is Plugged In
*   **Important**: Gaming laptops heavily throttle GPU VRAM bus clocks and power usage (capping it around 10W) when running on battery. **Connect your charger** to unlock the full GPU power (P0 state) and speed up response times.

### Step 3: Run the App in Host-Bridge Mode
Inside `frontend/src/ai/lfmService.ts`, the developer flag is enabled:
```typescript
const USE_HOST_LLM_BRIDGE = true;
const HOST_LLM_API = 'http://10.0.2.2:11434/api/generate';
```
When `USE_HOST_LLM_BRIDGE` is `true`:
1.  **Skip Startup Load**: The app skips loading the 2GB model into emulator memory (preventing memory pressure/crashes).
2.  **Redirect HTTP**: All inference requests are redirected to `10.0.2.2:11434` (translating to `localhost:11434` on the host machine).

Start Metro and run the app:
```bash
cd /home/jed/Gemi/soft-eng-2-project/frontend
npm start
```
*(Press `a` in your terminal to open the app on the emulator).*

---

## 🔒 Reverting to Standalone Native On-Device (Production Release)

If you need to verify final release performance running 100% on-device without the host computer:

1.  **Toggle Bridge Off**: Set `USE_HOST_LLM_BRIDGE = false` in `lfmService.ts`.
2.  **Sideload/Bundle weights**: Copy the `.gguf` model file directly to the sandbox files directory or bundle it using `npm run bundle:model` when building the full release APK.
