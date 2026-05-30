#include <jni.h>
#include <string>
#include <vector>
#include <mutex>
#include "llama.h"

struct LfmModel {
  llama_model *model = nullptr;
  llama_context *ctx = nullptr;
};

static std::mutex g_mutex;
static bool g_backend_initialized = false;

static void ensure_backend_initialized() {
  if (!g_backend_initialized) {
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

  const std::string path = jstring_to_utf8(env, modelPath);
  if (path.empty()) {
    return 0;
  }

  llama_model_params model_params = llama_model_default_params();
  model_params.use_mmap = true;
  model_params.use_mlock = false;

  llama_context_params ctx_params = llama_context_default_params();
  ctx_params.n_ctx = nCtx;
  ctx_params.n_threads = nThreads;
  ctx_params.n_threads_batch = nThreads;
  ctx_params.n_batch = nBatch;

  llama_model *model = llama_model_load_from_file(path.c_str(), model_params);
  if (!model) {
    return 0;
  }

  llama_context *ctx = llama_init_from_model(model, ctx_params);
  if (!ctx) {
    llama_model_free(model);
    return 0;
  }

  auto *handle = new LfmModel();
  handle->model = model;
  handle->ctx = ctx;
  return reinterpret_cast<jlong>(handle);
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
  const int n_vocab = llama_vocab_n_tokens(vocab);

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

  llama_batch batch = llama_batch_init(n_prompt + maxTokens, 0, 1);
  batch_clear(batch);
  for (int i = 0; i < n_prompt; ++i) {
    batch_add(batch, promptTokens[i], i, i == n_prompt - 1);
  }

  if (llama_decode(ctx, batch) != 0) {
    llama_batch_free(batch);
    std::string message = "Failed to decode prompt";
    return env->NewStringUTF(message.c_str());
  }

  std::string output;
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
  llama_sampler_chain_add(sampler, llama_sampler_init_dist(LLAMA_DEFAULT_SEED));

  for (int i = 0; i < maxTokens; ++i) {
    const llama_token token = llama_sampler_sample(sampler, ctx, -1);
    llama_sampler_accept(sampler, token);

    if (llama_vocab_is_eog(vocab, token)) {
      break;
    }

    std::vector<char> piece(8 * 1024);
    const int piece_len = llama_token_to_piece(
      vocab,
      token,
      piece.data(),
      static_cast<int>(piece.size()),
      0,
      true
    );
    if (piece_len > 0) {
      output.append(piece.data(), piece_len);
    }

    batch_clear(batch);
    batch_add(batch, token, n_prompt + i, true);
    if (llama_decode(ctx, batch) != 0) {
      break;
    }
  }

  llama_sampler_free(sampler);
  llama_batch_free(batch);
  return env->NewStringUTF(output.c_str());
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
