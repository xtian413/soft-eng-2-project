package com.anonymous.frontend.llm

import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.concurrent.Executors

class LfmModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val executor = Executors.newSingleThreadExecutor()
    private val context: Context = reactContext
    private var modelHandle: Long = 0

    override fun getName(): String = NAME

    companion object {
        const val NAME = "LfmModule"
    }

    @ReactMethod
    fun initModel(modelPath: String, nCtx: Int, nThreads: Int, nBatch: Int, promise: Promise) {
        executor.execute {
            try {
                val handle = LlamaBridge.initModel(modelPath, nCtx, nThreads, nBatch)
                if (handle <= 0L) {
                    promise.reject("E_LFM_INIT", "Failed to initialize LFM model")
                    return@execute
                }
                modelHandle = handle
                promise.resolve("Model initialized successfully")
            } catch (e: Exception) {
                promise.reject("E_LFM_INIT", "Failed to initialize LFM model: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun generateResponse(
        prompt: String,
        maxTokens: Int,
        temperature: Double,
        topP: Double,
        topK: Int,
        repeatPenalty: Double,
        promise: Promise
    ) {
        val handle = modelHandle
        if (handle <= 0L) {
            promise.reject("E_LFM_NOT_INITIALIZED", "Model not initialized. Call initModel() first.")
            return
        }

        executor.execute {
            try {
                val result = LlamaBridge.generate(
                    handle,
                    prompt,
                    maxTokens,
                    temperature.toFloat(),
                    topP.toFloat(),
                    topK,
                    repeatPenalty.toFloat()
                )
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("E_LFM_INFERENCE", "Inference failed: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun closeModel(promise: Promise) {
        executor.execute {
            try {
                val handle = modelHandle
                if (handle > 0L) {
                    LlamaBridge.freeModel(handle)
                }
                modelHandle = 0
                promise.resolve("Model closed successfully")
            } catch (e: Exception) {
                promise.reject("E_LFM_CLOSE", "Failed to close model: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun copyAsset(assetName: String, promise: Promise) {
        executor.execute {
            try {
                val destFile = java.io.File(context.filesDir, assetName.substringAfterLast("/"))
                if (destFile.exists() && destFile.length() > 0) {
                    promise.resolve(destFile.absolutePath)
                    return@execute
                }

                context.assets.open(assetName).use { inputStream ->
                    java.io.FileOutputStream(destFile).use { outputStream ->
                        val buffer = ByteArray(4 * 1024 * 1024)
                        var read: Int
                        while (inputStream.read(buffer).also { read = it } != -1) {
                            outputStream.write(buffer, 0, read)
                        }
                        outputStream.flush()
                    }
                }
                promise.resolve(destFile.absolutePath)
            } catch (e: Exception) {
                promise.reject("E_LFM_COPY", "Failed to copy asset $assetName: ${e.message}", e)
            }
        }
    }
}
