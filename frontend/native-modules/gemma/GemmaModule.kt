package com.anonymous.frontend.gemma

import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.mediapipe.tasks.genai.llm.LlmInference
import java.util.concurrent.Executors

class GemmaModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var llmInference: LlmInference? = null
    private val executor = Executors.newSingleThreadExecutor()
    private val context: Context = reactContext

    override fun getName(): String = NAME

    companion object {
        const val NAME = "GemmaModule"
    }

    @ReactMethod
    fun initModel(modelPath: String, promise: Promise) {
        executor.execute {
            try {
                llmInference = LlmInference.createFromFile(context, modelPath)
                promise.resolve("Model initialized successfully")
            } catch (e: Exception) {
                promise.reject("E_GEMMA_INIT", "Failed to initialize Gemma model: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun generateResponse(prompt: String, promise: Promise) {
        if (llmInference == null) {
            promise.reject("E_GEMMA_NOT_INITIALIZED", "Model not initialized. Call initModel() first.")
            return
        }

        executor.execute {
            try {
                val result = llmInference!!.generateResponse(prompt)
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("E_GEMMA_INFERENCE", "Inference failed: ${e.message}", e)
            }
        }
    }
}
