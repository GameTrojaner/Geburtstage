package io.github.gametrojaner.geburtstage

import android.Manifest
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

class BirthdayNotificationReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val hasPermission =
                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
                    PackageManager.PERMISSION_GRANTED
            if (!hasPermission) return
        }

        LocalNotificationsNativeModule.ensureBirthdayChannel(context)

        val notificationId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, 0)
        LocalNotificationsNativeModule.removeScheduledId(context, notificationId)
        val title = intent.getStringExtra(EXTRA_TITLE) ?: context.getString(R.string.app_name)
        val body = intent.getStringExtra(EXTRA_BODY) ?: ""

        val launchIntent =
            context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                val contactId = intent.getStringExtra(EXTRA_CONTACT_ID)
                if (contactId != null) {
                    putExtra(EXTRA_CONTACT_ID, contactId)
                }
            }

        val contentPendingIntent =
            launchIntent?.let {
                PendingIntent.getActivity(
                    context,
                    notificationId,
                    it,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )
            }

        val notification =
            NotificationCompat.Builder(context, LocalNotificationsNativeModule.CHANNEL_ID)
                .setSmallIcon(R.drawable.notification_icon)
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .apply {
                    if (contentPendingIntent != null) {
                        setContentIntent(contentPendingIntent)
                    }
                }
                .build()

        NotificationManagerCompat.from(context).notify(notificationId, notification)
    }

    companion object {
        const val EXTRA_NOTIFICATION_ID = "notificationId"
        const val EXTRA_TITLE = "title"
        const val EXTRA_BODY = "body"
        const val EXTRA_CONTACT_ID = "contactId"
    }
}
