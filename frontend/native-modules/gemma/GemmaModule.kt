package com.anonymous.frontend.gemma

import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.ai.edge.litertlm.Engine
import com.google.ai.edge.litertlm.EngineConfig
import java.util.concurrent.Executors

class GemmaModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var engine: Engine? = null
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
                val engineConfig = EngineConfig(modelPath = modelPath)
                val newEngine = Engine(engineConfig)
                newEngine.initialize()
                engine = newEngine
                promise.resolve("Model initialized successfully")
            } catch (e: Exception) {
                promise.reject("E_GEMMA_INIT", "Failed to initialize Gemma model: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun generateResponse(prompt: String, promise: Promise) {
        val currentEngine = engine
        if (currentEngine == null) {
            promise.reject("E_GEMMA_NOT_INITIALIZED", "Model not initialized. Call initModel() first.")
            return
        }

        executor.execute {
            try {
                val conversation = currentEngine.createConversation()
                val result = conversation.sendMessage(prompt)
                // The Message object contains the generated text.
                // Depending on the version, it might be in .text or we fallback to string.
                val extractedString = try {
                    result.javaClass.getMethod("getText").invoke(result) as? String ?: result.toString()
                } catch (e: Exception) {
                    try {
                        // Fallback to getting contents list if text property doesn't exist directly
                        val contents = result.javaClass.getMethod("getContents").invoke(result) as? List<*>
                        contents?.joinToString("") { it.toString() } ?: result.toString()
                    } catch (e2: Exception) {
                        result.toString()
                    }
                }
                
                conversation.close()
                promise.resolve(extractedString)
            } catch (e: Exception) {
                promise.reject("E_GEMMA_INFERENCE", "Inference failed: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun closeModel(promise: Promise) {
        executor.execute {
            try {
                engine?.close()
                engine = null
                promise.resolve("Model closed successfully")
            } catch (e: Exception) {
                promise.reject("E_GEMMA_CLOSE", "Failed to close model: ${e.message}", e)
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
                promise.reject("E_GEMMA_COPY", "Failed to copy asset $assetName: ${e.message}", e)
            }
        }
    }
}
