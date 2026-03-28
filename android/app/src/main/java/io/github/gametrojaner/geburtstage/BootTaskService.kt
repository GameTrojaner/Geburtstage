package io.github.gametrojaner.geburtstage

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.os.Build
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * Headless service that runs the "RescheduleNotifications" JS task on boot.
 *
 * Must call startForeground() immediately on API 26+ because the system would
 * otherwise crash the service within 5 seconds of startForegroundService().
 * The notification is removed automatically when the service stops.
 */
class BootTaskService : HeadlessJsTaskService() {

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForeground(NOTIFICATION_ID, buildNotification())
        }
        return super.onStartCommand(intent, flags, startId)
    }

    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig =
        HeadlessJsTaskConfig(
            "RescheduleNotifications",
            Arguments.createMap(),
            10_000,  // JS task timeout in ms
            true,    // allowed to run while app is in foreground
        )

    // ---------------------------------------------------------------------------

    private fun buildNotification(): Notification {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Birthday reminders",
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                setShowBadge(false)
                setSound(null, null)
            }
            getSystemService(NotificationManager::class.java)
                .createNotificationChannel(channel)
        }

        @Suppress("DEPRECATION")
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("Geburtstage")
                .setContentText("Rescheduling birthday reminders…")
                .setSmallIcon(R.drawable.notification_icon)
                .setOngoing(true)
                .setSilent(true)
                .build()
        } else {
            Notification.Builder(this)
                .setContentTitle("Geburtstage")
                .setContentText("Rescheduling birthday reminders…")
                .setSmallIcon(R.drawable.notification_icon)
                .build()
        }
    }

    companion object {
        private const val CHANNEL_ID = "birthdays"
        private const val NOTIFICATION_ID = 9001
    }
}
