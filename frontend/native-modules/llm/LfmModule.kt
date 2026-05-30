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
    @Volatile
    private var modelHandle: Long = 0
    private var loadedModelPath: String? = null
    private var loadedNCtx: Int = 0
    private var loadedNThreads: Int = 0
    private var loadedNBatch: Int = 0

    override fun getName(): String = NAME

    companion object {
        const val NAME = "LfmModule"
    }

    @ReactMethod
    fun initModel(modelPath: String, nCtx: Int, nThreads: Int, nBatch: Int, promise: Promise) {
        executor.execute {
            try {
                val modelFile = java.io.File(modelPath)
                if (!modelFile.exists() || modelFile.length() <= 0) {
                    promise.reject(
                        "E_LFM_INIT",
                        "Model file missing or empty at $modelPath"
                    )
                    return@execute
                }

                val existingHandle = modelHandle
                if (
                    existingHandle != 0L &&
                    loadedModelPath == modelPath &&
                    loadedNCtx == nCtx &&
                    loadedNThreads == nThreads &&
                    loadedNBatch == nBatch
                ) {
                    promise.resolve("Model already initialized")
                    return@execute
                }

                if (existingHandle != 0L) {
                    LlamaBridge.freeModel(existingHandle)
                    modelHandle = 0
                    loadedModelPath = null
                    loadedNCtx = 0
                    loadedNThreads = 0
                    loadedNBatch = 0
                }

                var loadedCtx = nCtx
                var loadedThreads = nThreads
                var loadedBatch = nBatch
                var handle = LlamaBridge.initModel(modelPath, nCtx, nThreads, nBatch)
                if (handle == 0L && (nCtx > 1024 || nBatch > 32 || nThreads > 2)) {
                    val fallbackCtx = minOf(1024, nCtx)
                    val fallbackBatch = minOf(32, nBatch)
                    val fallbackThreads = minOf(2, nThreads)
                    handle = LlamaBridge.initModel(
                        modelPath,
                        fallbackCtx,
                        fallbackThreads,
                        fallbackBatch
                    )
                    if (handle != 0L) {
                        loadedCtx = fallbackCtx
                        loadedThreads = fallbackThreads
                        loadedBatch = fallbackBatch
                    }
                }
                if (handle == 0L) {
                    val nativeError = LlamaBridge.getLastError().ifBlank {
                        "Check logcat for native errors."
                    }
                    promise.reject(
                        "E_LFM_INIT",
                        "Failed to initialize LFM model: $nativeError"
                    )
                    return@execute
                }
                modelHandle = handle
                loadedModelPath = modelPath
                loadedNCtx = loadedCtx
                loadedNThreads = loadedThreads
                loadedNBatch = loadedBatch
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
        if (handle == 0L) {
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
    fun cancelGeneration(promise: Promise) {
        try {
            val handle = modelHandle
            if (handle == 0L) {
                promise.resolve("No active model")
                return
            }

            LlamaBridge.cancelGeneration(handle)
            promise.resolve("Generation cancellation requested")
        } catch (e: Exception) {
            promise.reject("E_LFM_CANCEL", "Failed to cancel generation: ${e.message}", e)
        }
    }

    @ReactMethod
    fun closeModel(promise: Promise) {
        executor.execute {
            try {
                val handle = modelHandle
                if (handle != 0L) {
                    LlamaBridge.freeModel(handle)
                }
                modelHandle = 0
                loadedModelPath = null
                loadedNCtx = 0
                loadedNThreads = 0
                loadedNBatch = 0
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
                val expectedSize = getAssetSize(assetName)
                if (
                    destFile.exists() &&
                    destFile.length() > 0 &&
                    (expectedSize == null || destFile.length() == expectedSize)
                ) {
                    promise.resolve(destFile.absolutePath)
                    return@execute
                }

                if (destFile.exists() && !destFile.delete()) {
                    promise.reject(
                        "E_LFM_COPY",
                        "Failed to replace stale model copy at ${destFile.absolutePath}"
                    )
                    return@execute
                }

                var copiedBytes = 0L
                context.assets.open(assetName).use { inputStream ->
                    java.io.FileOutputStream(destFile).use { outputStream ->
                        val buffer = ByteArray(4 * 1024 * 1024)
                        var read: Int
                        while (inputStream.read(buffer).also { read = it } != -1) {
                            outputStream.write(buffer, 0, read)
                            copiedBytes += read.toLong()
                        }
                        outputStream.flush()
                    }
                }
                if (expectedSize != null && copiedBytes != expectedSize) {
                    destFile.delete()
                    promise.reject(
                        "E_LFM_COPY",
                        "Copied model size mismatch for $assetName: expected $expectedSize bytes, copied $copiedBytes bytes"
                    )
                    return@execute
                }
                promise.resolve(destFile.absolutePath)
            } catch (e: Exception) {
                promise.reject("E_LFM_COPY", "Failed to copy asset $assetName: ${e.message}", e)
            }
        }
    }

    private fun getAssetSize(assetName: String): Long? {
        return try {
            context.assets.openFd(assetName).use { asset ->
                asset.length
            }
        } catch (_: Exception) {
            null
        }
    }
}
