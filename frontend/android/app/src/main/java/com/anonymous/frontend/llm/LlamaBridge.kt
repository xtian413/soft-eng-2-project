package com.anonymous.frontend.llm

object LlamaBridge {
    init {
        System.loadLibrary("llama_jni")
    }

    external fun initModel(modelPath: String, nCtx: Int, nThreads: Int, nBatch: Int): Long
    external fun generate(
        handle: Long,
        prompt: String,
        maxTokens: Int,
        temperature: Float,
        topP: Float,
        topK: Int,
        repeatPenalty: Float
    ): String
    external fun freeModel(handle: Long)
}
