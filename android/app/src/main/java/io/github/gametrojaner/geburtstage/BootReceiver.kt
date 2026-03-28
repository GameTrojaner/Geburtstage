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
        if (intent.action != Intent.ACTION_BOOT_COMPLETED &&
            intent.action != "android.intent.action.QUICKBOOT_POWERON"
        ) return

        // Acquire a wake lock immediately so the device stays awake long enough
        // for the HeadlessJsTaskService to initialise.
        HeadlessJsTaskService.acquireWakeLockNow(context)

        val serviceIntent = Intent(context, BootTaskService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent)
        } else {
            context.startService(serviceIntent)
        }
    }
}
