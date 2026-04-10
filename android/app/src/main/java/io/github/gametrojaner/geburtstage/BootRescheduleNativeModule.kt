package io.github.gametrojaner.geburtstage

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class BootRescheduleNativeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "BootReschedule"

    @ReactMethod
    fun consumePendingReschedule(promise: Promise) {
        try {
            promise.resolve(BootRescheduleState.consumePending(reactApplicationContext))
        } catch (e: Exception) {
            promise.reject("CONSUME_PENDING_RESCHEDULE_FAILED", e.message, e)
        }
    }
}