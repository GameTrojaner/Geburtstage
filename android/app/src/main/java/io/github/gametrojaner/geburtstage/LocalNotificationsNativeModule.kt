package io.github.gametrojaner.geburtstage

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.json.JSONArray
import org.json.JSONObject

class LocalNotificationsNativeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "LocalNotifications"

    @ReactMethod
    fun areNotificationsEnabled(promise: Promise) {
        try {
            val enabled = NotificationManagerCompat.from(reactApplicationContext).areNotificationsEnabled()
            promise.resolve(enabled)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun setupBirthdayChannel(promise: Promise) {
        try {
            ensureBirthdayChannel(reactApplicationContext)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("CHANNEL_SETUP_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun cancelAllScheduledNotifications(promise: Promise) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val ids = prefs.getStringSet(KEY_IDS, emptySet())?.mapNotNull { it.toIntOrNull() } ?: emptyList()

            for (id in ids) {
                val pendingIntent = buildPendingIntent(context, id, null, null, null, PendingIntent.FLAG_NO_CREATE)
                if (pendingIntent != null) {
                    alarmManager?.cancel(pendingIntent)
                    pendingIntent.cancel()
                }
            }

            prefs.edit()
                .remove(KEY_IDS)
                .remove(KEY_SCHEDULES_JSON)
                .putInt(KEY_NEXT_ID, 1)
                .apply()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("CANCEL_ALL_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun scheduleNotificationAt(
        timestampMs: Double,
        title: String,
        body: String,
        contactId: String?,
        promise: Promise,
    ) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            if (alarmManager == null) {
                promise.reject("ALARM_MANAGER_UNAVAILABLE", "AlarmManager is unavailable")
                return
            }

            val triggerAt = timestampMs.toLong()
            val requestCode = nextRequestCode(context)
            val pendingIntent =
                buildPendingIntent(
                    context,
                    requestCode,
                    title,
                    body,
                    contactId,
                    PendingIntent.FLAG_UPDATE_CURRENT,
                )
                    ?: run {
                        promise.reject("PENDING_INTENT_FAILED", "Failed to create PendingIntent")
                        return
                    }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarmManager.canScheduleExactAlarms()) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
            }

            trackScheduledId(context, requestCode)
            trackScheduledPayload(context, requestCode, triggerAt, title, body, contactId)
            promise.resolve(requestCode)
        } catch (e: Exception) {
            promise.reject("SCHEDULE_FAILED", e.message, e)
        }
    }

    private fun buildPendingIntent(
        context: Context,
        requestCode: Int,
        title: String?,
        body: String?,
        contactId: String?,
        flags: Int,
    ): PendingIntent? {
        val intent =
            Intent(context, BirthdayNotificationReceiver::class.java).apply {
                putExtra(BirthdayNotificationReceiver.EXTRA_NOTIFICATION_ID, requestCode)
                if (title != null) putExtra(BirthdayNotificationReceiver.EXTRA_TITLE, title)
                if (body != null) putExtra(BirthdayNotificationReceiver.EXTRA_BODY, body)
                if (contactId != null) putExtra(BirthdayNotificationReceiver.EXTRA_CONTACT_ID, contactId)
            }

        val pendingFlags = flags or PendingIntent.FLAG_IMMUTABLE
        return PendingIntent.getBroadcast(context, requestCode, intent, pendingFlags)
    }

    private fun nextRequestCode(context: Context): Int {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val current = prefs.getInt(KEY_NEXT_ID, 1)
        prefs.edit().putInt(KEY_NEXT_ID, current + 1).apply()
        return current
    }

    private fun trackScheduledId(context: Context, requestCode: Int) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val ids = prefs.getStringSet(KEY_IDS, emptySet())?.toMutableSet() ?: mutableSetOf()
        ids.add(requestCode.toString())
        prefs.edit().putStringSet(KEY_IDS, ids).apply()
    }

    companion object {
        const val CHANNEL_ID = "birthdays"
        private const val PREFS_NAME = "local_notifications"
        private const val KEY_IDS = "scheduled_ids"
        private const val KEY_NEXT_ID = "next_id"
        private const val KEY_SCHEDULES_JSON = "scheduled_payloads_json"

        fun removeScheduledId(context: Context, requestCode: Int) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val ids = prefs.getStringSet(KEY_IDS, emptySet())?.toMutableSet() ?: mutableSetOf()
            if (ids.remove(requestCode.toString())) {
                prefs.edit().putStringSet(KEY_IDS, ids).apply()
            }

            val existingPayloads = readSchedulesJsonArray(prefs)
            val updatedPayloads = JSONArray()
            for (index in 0 until existingPayloads.length()) {
                val item = existingPayloads.optJSONObject(index) ?: continue
                if (item.optInt("id", -1) != requestCode) {
                    updatedPayloads.put(item)
                }
            }
            prefs.edit().putString(KEY_SCHEDULES_JSON, updatedPayloads.toString()).apply()
        }

        fun reschedulePersistedNotifications(context: Context) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val existingPayloads = readSchedulesJsonArray(prefs)
            val now = System.currentTimeMillis()
            val remainingPayloads = JSONArray()
            val remainingIds = mutableSetOf<String>()

            for (index in 0 until existingPayloads.length()) {
                val item = existingPayloads.optJSONObject(index) ?: continue

                val id = item.optInt("id", -1)
                val triggerAt = item.optLong("triggerAt", -1L)
                val title = item.optString("title", "")
                val body = item.optString("body", "")
                val contactId = if (item.has("contactId") && !item.isNull("contactId")) {
                    item.optString("contactId").takeIf { it.isNotBlank() }
                } else {
                    null
                }

                if (id <= 0 || triggerAt <= now) {
                    continue
                }

                val pendingIntent =
                    buildPendingIntentStatic(
                        context,
                        id,
                        title,
                        body,
                        contactId,
                        PendingIntent.FLAG_UPDATE_CURRENT,
                    )
                if (pendingIntent != null) {
                    scheduleAlarm(alarmManager, triggerAt, pendingIntent)
                    remainingPayloads.put(item)
                    remainingIds.add(id.toString())
                }
            }

            // Keep KEY_IDS and KEY_SCHEDULES_JSON in sync; remove stale IDs from dropped expired payloads
            prefs.edit()
                .putString(KEY_SCHEDULES_JSON, remainingPayloads.toString())
                .putStringSet(KEY_IDS, remainingIds)
                .apply()
        }

        private fun trackScheduledPayload(
            context: Context,
            requestCode: Int,
            triggerAt: Long,
            title: String,
            body: String,
            contactId: String?,
        ) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val existingPayloads = readSchedulesJsonArray(prefs)
            val updatedPayloads = JSONArray()

            for (index in 0 until existingPayloads.length()) {
                val item = existingPayloads.optJSONObject(index) ?: continue
                if (item.optInt("id", -1) != requestCode) {
                    updatedPayloads.put(item)
                }
            }

            val payload = JSONObject().apply {
                put("id", requestCode)
                put("triggerAt", triggerAt)
                put("title", title)
                put("body", body)
                if (contactId == null) {
                    put("contactId", JSONObject.NULL)
                } else {
                    put("contactId", contactId)
                }
            }
            updatedPayloads.put(payload)

            prefs.edit().putString(KEY_SCHEDULES_JSON, updatedPayloads.toString()).apply()
        }

        private fun readSchedulesJsonArray(prefs: android.content.SharedPreferences): JSONArray {
            val raw = prefs.getString(KEY_SCHEDULES_JSON, null)
            if (raw.isNullOrBlank()) return JSONArray()
            return try {
                JSONArray(raw)
            } catch (_: Exception) {
                JSONArray()
            }
        }

        private fun buildPendingIntentStatic(
            context: Context,
            requestCode: Int,
            title: String?,
            body: String?,
            contactId: String?,
            flags: Int,
        ): PendingIntent? {
            val intent =
                Intent(context, BirthdayNotificationReceiver::class.java).apply {
                    putExtra(BirthdayNotificationReceiver.EXTRA_NOTIFICATION_ID, requestCode)
                    if (title != null) putExtra(BirthdayNotificationReceiver.EXTRA_TITLE, title)
                    if (body != null) putExtra(BirthdayNotificationReceiver.EXTRA_BODY, body)
                    if (contactId != null) putExtra(BirthdayNotificationReceiver.EXTRA_CONTACT_ID, contactId)
                }

            val pendingFlags = flags or PendingIntent.FLAG_IMMUTABLE
            return PendingIntent.getBroadcast(context, requestCode, intent, pendingFlags)
        }

        private fun scheduleAlarm(alarmManager: AlarmManager, triggerAt: Long, pendingIntent: PendingIntent) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
                } else {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
            }
        }

        fun ensureBirthdayChannel(context: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (manager.getNotificationChannel(CHANNEL_ID) != null) return

            val channel =
                NotificationChannel(
                    CHANNEL_ID,
                    "Birthdays",
                    NotificationManager.IMPORTANCE_HIGH,
                ).apply {
                    description = "Birthday reminders"
                    enableVibration(true)
                }

            manager.createNotificationChannel(channel)
        }
    }
}
