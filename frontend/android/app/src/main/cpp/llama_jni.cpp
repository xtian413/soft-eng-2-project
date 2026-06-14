#include <jni.h>
#include <string>
#include <vector>
#include <mutex>
#include <fstream>
#include <sstream>
#include <algorithm>
#include <atomic>
#include <chrono>
#include <android/log.h>
#include "llama.h"

#define LOG_TAG "LlamaJNI"

static void log_native(const char *level, const char *message) {
  if (!message) {
    return;
  }
  if (level && level[0] == 'E') {
    __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, "%s", message);
  } else {
    __android_log_print(ANDROID_LOG_INFO, LOG_TAG, "%s", message);
  }
}

struct LfmModel {
  llama_model *model = nullptr;
  llama_context *ctx = nullptr;
  std::atomic_bool cancel_requested{false};
};

static std::mutex g_mutex;
static bool g_backend_initialized = false;
static std::string g_last_error;
static constexpr int64_t kMaxGenerationElapsedMs = 175000;

static void set_last_error(const std::string &message) {
  g_last_error = message;
  log_native("E", message.c_str());
}

static void llama_log_callback(ggml_log_level level, const char *text, void *) {
  if (!text) {
    return;
  }

  const bool is_error = level == GGML_LOG_LEVEL_ERROR;
  __android_log_print(is_error ? ANDROID_LOG_ERROR : ANDROID_LOG_INFO, LOG_TAG, "%s", text);
  if (is_error) {
    g_last_error = text;
  }
}

static void ensure_backend_initialized() {
  if (!g_backend_initialized) {
    llama_log_set(llama_log_callback, nullptr);
    llama_backend_init();
    g_backend_initialized = true;
  }
}

static std::string jstring_to_utf8(JNIEnv *env, jstring value) {
  if (!value) return "";
  const char *chars = env->GetStringUTFChars(value, nullptr);
  std::string result(chars ? chars : "");
  if (chars) env->ReleaseStringUTFChars(value, chars);
  return result;
}

static void batch_clear(llama_batch &batch) {
  batch.n_tokens = 0;
}

static void batch_add(llama_batch &batch, llama_token token, int pos, bool logits) {
  const int index = batch.n_tokens;
  batch.token[index] = token;
  batch.pos[index] = pos;
  batch.seq_id[index][0] = 0;
  batch.n_seq_id[index] = 1;
  batch.logits[index] = logits ? 1 : 0;
  batch.n_tokens++;
}

static bool decode_tokens(
    llama_context *ctx,
    const std::vector<llama_token> &tokens,
    int start,
    int count,
    int pos_offset,
    bool logits_last,
    llama_batch &batch) {
  batch_clear(batch);
  for (int i = 0; i < count; ++i) {
    const bool logits = logits_last && i == count - 1;
    batch_add(batch, tokens[start + i], pos_offset + i, logits);
  }
  return llama_decode(ctx, batch) == 0;
}

static std::string token_to_piece_string(const llama_vocab *vocab, llama_token token) {
  std::vector<char> piece(8 * 1024);
  const int piece_len = llama_token_to_piece(
      vocab,
      token,
      piece.data(),
      static_cast<int>(piece.size()),
      0,
      true
  );
  if (piece_len <= 0) {
    return "";
  }
  return std::string(piece.data(), piece_len);
}

extern "C" JNIEXPORT jlong JNICALL
Java_com_anonymous_frontend_llm_LlamaBridge_initModel(
    JNIEnv *env,
    jclass,
    jstring modelPath,
    jint nCtx,
    jint nThreads,
    jint nBatch) {
  std::lock_guard<std::mutex> lock(g_mutex);
  ensure_backend_initialized();
  g_last_error.clear();

  const std::string path = jstring_to_utf8(env, modelPath);
  if (path.empty()) {
    set_last_error("Model path is empty");
    return 0;
  }

  std::ifstream file(path, std::ios::binary | std::ios::ate);
  if (!file.good()) {
    set_last_error("Model file not found or unreadable: " + path);
    return 0;
  }
  const auto file_size = file.tellg();
  if (file_size <= 0) {
    set_last_error("Model file is empty: " + path);
    return 0;
  }
  file.close();

  llama_model_params model_params = llama_model_default_params();
  model_params.n_gpu_layers = 0;
  model_params.use_mmap = true;
  model_params.use_mlock = false;

  llama_context_params ctx_params = llama_context_default_params();
  ctx_params.n_ctx = nCtx;
  ctx_params.n_threads = nThreads;
  ctx_params.n_threads_batch = nThreads;
  ctx_params.n_batch = nBatch;
  ctx_params.n_ubatch = nBatch;
  ctx_params.flash_attn_type = LLAMA_FLASH_ATTN_TYPE_DISABLED;
  ctx_params.offload_kqv = false;
  ctx_params.op_offload = false;

  llama_model *model = nullptr;
  try {
    model = llama_model_load_from_file(path.c_str(), model_params);
    if (!model) {
      log_native("E", "Failed to load model with mmap; retrying without mmap");
      model_params.use_mmap = false;
      model = llama_model_load_from_file(path.c_str(), model_params);
    }
  } catch (const std::exception &e) {
    set_last_error(std::string("Exception while loading model: ") + e.what());
    return 0;
  } catch (...) {
    set_last_error("Unknown exception while loading model");
    return 0;
  }
  if (!model) {
    if (g_last_error.empty()) {
      std::ostringstream message;
      message << "Failed to load model file (" << file_size << " bytes): " << path;
      set_last_error(message.str());
    }
    return 0;
  }

  llama_context *ctx = nullptr;
  try {
    ctx = llama_init_from_model(model, ctx_params);
  } catch (const std::exception &e) {
    set_last_error(std::string("Exception while initializing context: ") + e.what());
    llama_model_free(model);
    return 0;
  } catch (...) {
    set_last_error("Unknown exception while initializing context");
    llama_model_free(model);
    return 0;
  }
  if (!ctx) {
    if (g_last_error.empty()) {
      set_last_error("Failed to initialize context from model");
    }
    llama_model_free(model);
    return 0;
  }

  auto *handle = new LfmModel();
  handle->model = model;
  handle->ctx = ctx;
  return reinterpret_cast<jlong>(handle);
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_anonymous_frontend_llm_LlamaBridge_getLastError(JNIEnv *env, jclass) {
  std::lock_guard<std::mutex> lock(g_mutex);
  return env->NewStringUTF(g_last_error.c_str());
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_anonymous_frontend_llm_LlamaBridge_generate(
    JNIEnv *env,
    jclass,
    jlong handle,
    jstring prompt,
    jint maxTokens,
    jfloat temperature,
    jfloat topP,
    jint topK,
    jfloat repeatPenalty) {
  auto *modelHandle = reinterpret_cast<LfmModel *>(handle);
  if (!modelHandle || !modelHandle->model || !modelHandle->ctx) {
    std::string message = "Model not initialized";
    return env->NewStringUTF(message.c_str());
  }
  modelHandle->cancel_requested.store(false, std::memory_order_release);

  const std::string promptText = jstring_to_utf8(env, prompt);
  if (promptText.empty()) {
    std::string message = "Empty prompt";
    return env->NewStringUTF(message.c_str());
  }

  llama_context *ctx = modelHandle->ctx;
  llama_model *model = modelHandle->model;
  const llama_vocab *vocab = llama_model_get_vocab(model);
  llama_memory_clear(llama_get_memory(ctx), true);

  const int n_ctx = llama_n_ctx(ctx);
  const int n_batch = static_cast<int>(llama_n_batch(ctx));
  if (n_batch <= 0) {
    std::string message = "Invalid model batch size";
    return env->NewStringUTF(message.c_str());
  }

  std::vector<llama_token> promptTokens(promptText.size() + 8);
  const int n_prompt = llama_tokenize(
      vocab,
      promptText.c_str(),
      static_cast<int>(promptText.size()),
      promptTokens.data(),
      static_cast<int>(promptTokens.size()),
      true,
      true
  );
  if (n_prompt <= 0) {
    std::string message = "Failed to tokenize prompt";
    return env->NewStringUTF(message.c_str());
  }
  promptTokens.resize(n_prompt);

  if (n_prompt >= n_ctx) {
    std::string message = "Prompt too long for context";
    return env->NewStringUTF(message.c_str());
  }

  const int n_predict = std::max(0, std::min(static_cast<int>(maxTokens), n_ctx - n_prompt - 1));
  if (n_predict == 0) {
    std::string message = "Prompt leaves no room for generation";
    return env->NewStringUTF(message.c_str());
  }
  const auto start_time = std::chrono::steady_clock::now();
  const auto has_timed_out = [&start_time]() {
    const auto elapsed_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::steady_clock::now() - start_time
    ).count();
    return elapsed_ms >= kMaxGenerationElapsedMs;
  };
  __android_log_print(
      ANDROID_LOG_INFO,
      LOG_TAG,
      "generate start: prompt_tokens=%d max_tokens=%d n_predict=%d n_ctx=%d n_batch=%d",
      n_prompt,
      maxTokens,
      n_predict,
      n_ctx,
      n_batch
  );

  llama_batch batch = llama_batch_init(n_batch, 0, 1);
  for (int start = 0; start < n_prompt; start += n_batch) {
    if (modelHandle->cancel_requested.load(std::memory_order_acquire)) {
      llama_batch_free(batch);
      __android_log_print(ANDROID_LOG_INFO, LOG_TAG, "generate cancelled while decoding prompt");
      return env->NewStringUTF("");
    }
    if (has_timed_out()) {
      llama_batch_free(batch);
      __android_log_print(ANDROID_LOG_INFO, LOG_TAG, "generate timed out while decoding prompt");
      return env->NewStringUTF("");
    }
    const int count = std::min(n_batch, n_prompt - start);
    if (!decode_tokens(ctx, promptTokens, start, count, start, start + count == n_prompt, batch)) {
      llama_batch_free(batch);
      std::string message = "Failed to decode prompt";
      return env->NewStringUTF(message.c_str());
    }
  }

  std::string output;
  int generated_tokens = 0;
  const auto chain_params = llama_sampler_chain_default_params();
  llama_sampler *sampler = llama_sampler_chain_init(chain_params);
  if (!sampler) {
    llama_batch_free(batch);
    std::string message = "Failed to initialize sampler";
    return env->NewStringUTF(message.c_str());
  }

  llama_sampler_chain_add(sampler, llama_sampler_init_penalties(64, repeatPenalty, 0.0f, 0.0f));
  if (topK > 0) {
    llama_sampler_chain_add(sampler, llama_sampler_init_top_k(topK));
  }
  if (topP > 0.0f && topP < 1.0f) {
    llama_sampler_chain_add(sampler, llama_sampler_init_top_p(topP, 1));
  }
  if (temperature > 0.0f) {
    llama_sampler_chain_add(sampler, llama_sampler_init_temp(temperature));
  }
  const uint32_t seed = static_cast<uint32_t>(
      std::chrono::steady_clock::now().time_since_epoch().count()
  );
  llama_sampler_chain_add(sampler, llama_sampler_init_dist(seed));

  const llama_token eos_token = llama_vocab_eos(vocab);
  const llama_token eot_token = llama_vocab_eot(vocab);
  for (int i = 0; i < n_predict; ++i) {
    if (modelHandle->cancel_requested.load(std::memory_order_acquire) || has_timed_out()) {
      break;
    }

    const llama_token token = llama_sampler_sample(sampler, ctx, -1);
    llama_sampler_accept(sampler, token);

    if (
        llama_vocab_is_eog(vocab, token) ||
        token == eos_token ||
        token == eot_token
    ) {
      break;
    }

    const std::string piece = token_to_piece_string(vocab, token);
    if (
        piece == "<|im_start|>" ||
        piece == "<|im_end|>" ||
        piece == "<|endoftext|>"
    ) {
      break;
    }
    if (!piece.empty()) {
      output.append(piece);
    }
    generated_tokens++;

    batch_clear(batch);
    batch_add(batch, token, n_prompt + i, true);
    if (llama_decode(ctx, batch) != 0) {
      break;
    }
  }

  llama_sampler_free(sampler);
  llama_batch_free(batch);
  const auto elapsed_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
      std::chrono::steady_clock::now() - start_time
  ).count();
  const double tokens_per_second = elapsed_ms > 0
      ? (static_cast<double>(generated_tokens) * 1000.0 / static_cast<double>(elapsed_ms))
      : 0.0;
  __android_log_print(
      ANDROID_LOG_INFO,
      LOG_TAG,
      "generate finished: output_chars=%lu generated_tokens=%d elapsed_ms=%lld tok_per_sec=%.2f cancelled=%s",
      static_cast<unsigned long>(output.size()),
      generated_tokens,
      static_cast<long long>(elapsed_ms),
      tokens_per_second,
      modelHandle->cancel_requested.load(std::memory_order_acquire) ? "true" : "false"
  );
  return env->NewStringUTF(output.c_str());
}

extern "C" JNIEXPORT void JNICALL
Java_com_anonymous_frontend_llm_LlamaBridge_cancelGeneration(
    JNIEnv *,
    jclass,
    jlong handle) {
  auto *modelHandle = reinterpret_cast<LfmModel *>(handle);
  if (!modelHandle) {
    return;
  }
  modelHandle->cancel_requested.store(true, std::memory_order_release);
}

extern "C" JNIEXPORT void JNICALL
Java_com_anonymous_frontend_llm_LlamaBridge_freeModel(
    JNIEnv *,
    jclass,
    jlong handle) {
  std::lock_guard<std::mutex> lock(g_mutex);
  auto *modelHandle = reinterpret_cast<LfmModel *>(handle);
  if (!modelHandle) {
    return;
  }
  if (modelHandle->ctx) {
    llama_free(modelHandle->ctx);
    modelHandle->ctx = nullptr;
  }
  if (modelHandle->model) {
    llama_model_free(modelHandle->model);
    modelHandle->model = nullptr;
  }
  delete modelHandle;
}
