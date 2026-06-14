# LFM2.5-1.2B Android Migration Plan
## Scope
Migrate Android on-device inference from LiteRT / MediaPipe LLM Inference (Gemma 2 2B E2B) to llama.cpp using LiquidAI LFM2.5-1.2B-Instruct-GGUF. Fully offline, local model, performance- and memory-aware.

---

## 1) Model Selection and Packaging
1. Select LFM2.5-1.2B-Instruct GGUF variants (quantization targets):
   - Primary: Q4_K_M (balance size/speed)
   - Optional: Q5_K_M or Q6_K for higher quality if memory allows
2. Decide distribution method:
   - A) Bundle in APK/OBB or Play Asset Delivery (recommended for large files)
   - B) One-time download, then cached to internal storage (still offline after download)
3. Choose storage path:
   - `context.filesDir/models/lfm2.5-1.2b.gguf`
4. Add integrity verification:
   - SHA256 check on first load and after file copy

---

## 2) llama.cpp Native Build Integration
1. Vendor llama.cpp into the repo (submodule or vendor copy):
   - Path example: `frontend/android/llama.cpp/`
2. Add CMakeLists.txt to build a shared library:
   - Enable ARM64 + NEON
   - Disable non-Android backends
3. Recommended build flags (CMake or ndkBuild):
   - `-O3 -ffast-math -funroll-loops`
   - `-DGGML_USE_NEON`
   - `-DGGML_USE_ACCELERATE=OFF`
4. Produce shared library:
   - `libllama.so`

---

## 3) JNI Bridge Layer
1. Implement JNI wrapper functions for core llama.cpp calls:
   - Model init: `llama_init_from_file`
   - Tokenize: `llama_tokenize`
   - Decode: `llama_decode`
   - Sampling: `llama_sample_top_p`, `llama_sample_top_k`
   - Free: `llama_free`
2. Expose a minimal JNI API for Kotlin:
   - `loadModel(path, n_ctx, n_threads, n_batch)`
   - `tokenize(prompt, add_bos)`
   - `generate(tokens, maxTokens, temperature, topP, topK, repeatPenalty, stopTokens)`
   - `freeModel()`
3. Ensure thread safety and single active model context.

---

## 4) Kotlin/Java Integration
1. Replace Gemma module/package with LLM module:
   - `GemmaModule.kt` -> `LlmModule.kt` (or `LfmModule.kt`)
   - `GemmaPackage.kt` -> `LlmPackage.kt`
2. Provide Kotlin wrapper class:
   - `LlamaEngine.loadModel(...)`
   - `LlamaEngine.generate(...)`
   - `LlamaEngine.close()`
3. Update React Native bridge (if used) to call new module names and methods.

---

## 5) Model Loading and Initialization
1. On app start or first use:
   - Check if GGUF exists in internal storage
   - Copy from assets/PAD if needed
2. Initialize llama context:
   - `n_ctx`: 1024 to 2048 (tune per device)
   - `n_threads`: min(4, available cores)
   - `n_batch`: 32 to 64 (reduce if memory pressure)
3. Use memory-mapped loading if supported to reduce peak RAM.

---

## 6) Prompt Formatting and Tokenization
1. Replace MediaPipe prompt templates with LFM2.5 instruction format.
2. Confirm exact LFM2.5 prompt tags from the model card.
3. Tokenize using llama.cpp tokenizer (no external tokenizer).
4. Update stop tokens/stop strings for proper output termination.

---

## 7) Inference Loop and Sampling
1. Implement decode loop:
   - Feed prompt tokens to `llama_decode`
   - Sample next token (top-k/top-p/temperature)
   - Append until maxTokens or stop condition
2. Support streaming tokens to UI (partial outputs).
3. Add configurable sampling settings (temperature, topP, topK, repeatPenalty).

---

## 8) Performance and Threading
1. Run inference on a dedicated background thread or coroutine.
2. Pin a single inference thread to avoid contention with UI.
3. Add optional warm-up run after model load.

---

## 9) Memory and Optimization
1. Keep model context loaded and reused across requests.
2. Use quantized model variants to keep memory under device budget.
3. Lower `n_ctx` and `n_batch` on memory-constrained devices.

---

## 10) Build Configuration Updates
1. Android Gradle:
   - Enable `externalNativeBuild` with CMake
   - Add `abiFilters` for `arm64-v8a` (and optionally `armeabi-v7a`)
2. Package GGUF model:
   - assets/ or PAD bundle entry
3. JNI linkage:
   - Load `libllama.so` with `System.loadLibrary("llama")`

---

## 11) Pre/Post Processing
1. Remove MediaPipe-specific preprocessing.
2. Ensure UTF-8 normalization for inputs.
3. Post-process outputs (trim stop strings, sanitize whitespace).

---

## 12) Integration and Tests
1. Update app-level AI service to call llama.cpp bridge.
2. Add instrumentation tests:
   - Model load success
   - Deterministic prompt response (fixed seed)
3. Measure memory and CPU with Android Profiler.

---

## 13) Validation Checklist
- Model loads with no network access.
- Inference returns valid output.
- Memory usage stays within target device limits.
- UI remains responsive during generation.
