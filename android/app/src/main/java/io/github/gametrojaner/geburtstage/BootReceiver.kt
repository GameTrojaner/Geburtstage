package io.github.gametrojaner.geburtstage

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import com.facebook.react.HeadlessJsTaskService

/**
 * Receives ACTION_BOOT_COMPLETED and starts BootTaskService so that birthday
 * notifications are rescheduled after a device reboot (Android cancels all
 * AlarmManager entries on power-off).
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON" -> {
                // Acquire a wake lock immediately so the device stays awake long enough
                // for the HeadlessJsTaskService to initialise.
                HeadlessJsTaskService.acquireWakeLockNow(context)

                val serviceIntent = Intent(context, BootTaskService::class.java)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }

                if (WidgetRefreshScheduler.hasAnyWidgetInstances(context)) {
                    WidgetRefreshScheduler.triggerWidgetUpdate(context)
                    WidgetRefreshScheduler.scheduleNextMidnightRefresh(context)
                } else {
                    WidgetRefreshScheduler.cancelMidnightRefresh(context)
                }
            }
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED,
            Intent.ACTION_DATE_CHANGED -> {
                if (WidgetRefreshScheduler.hasAnyWidgetInstances(context)) {
                    WidgetRefreshScheduler.triggerWidgetUpdate(context)
                    WidgetRefreshScheduler.scheduleNextMidnightRefresh(context)
                } else {
                    WidgetRefreshScheduler.cancelMidnightRefresh(context)
                }
            }
            else -> return
        }
    }
}
