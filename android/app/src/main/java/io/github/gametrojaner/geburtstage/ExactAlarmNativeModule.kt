package io.github.gametrojaner.geburtstage

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

/**
 * Exposes exact-alarm scheduling capability checks to JS.
 *
 * Background: expo-notifications falls back to inexact AlarmManager alarms
 * when canScheduleExactAlarms() returns false (Android 12+, API 31+, without
 * the SCHEDULE_EXACT_ALARM / USE_EXACT_ALARM permission). Inexact alarms can
 * be deferred by Android and will not fire at the configured time.
 *
 * USE_EXACT_ALARM (API 33+) is auto-granted for calendar/reminder apps.
 * SCHEDULE_EXACT_ALARM (API 31-32) requires manual user approval via:
 * Settings > Apps > Special app access > Alarms & reminders.
 */
class ExactAlarmNativeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "ExactAlarm"

    /** Resolves to true when exact alarms can be scheduled without user interaction. */
    @ReactMethod
    fun canScheduleExactAlarms(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            promise.resolve(true)
            return
        }
        val alarmManager =
            reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
        promise.resolve(alarmManager?.canScheduleExactAlarms() ?: false)
    }

    /**
     * Opens the "Alarms & reminders" special-access settings screen for this app.
     * Only needed on Android 12 (API 31–32); on API 33+ USE_EXACT_ALARM is
     * auto-granted and this is a no-op.
     */
    @ReactMethod
    fun openExactAlarmSettings(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                val intent = Intent(
                    Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                    Uri.parse("package:${reactApplicationContext.packageName}")
                ).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactApplicationContext.startActivity(intent)
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("OPEN_SETTINGS_FAILED", e.message, e)
            }
        } else {
            promise.resolve(null)
        }
    }
}
