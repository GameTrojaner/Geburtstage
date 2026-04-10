package io.github.gametrojaner.geburtstage

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import io.github.gametrojaner.geburtstage.widget.BirthdayFavorites
import io.github.gametrojaner.geburtstage.widget.BirthdayUpcoming
import java.util.Calendar

object WidgetRefreshScheduler {
    private const val MIDNIGHT_REFRESH_ACTION = "io.github.gametrojaner.geburtstage.WIDGET_MIDNIGHT_REFRESH"
    private const val MIDNIGHT_REFRESH_REQUEST_CODE = 7112

    private fun midnightRefreshIntent(context: Context): PendingIntent {
        val intent = Intent(context, WidgetRefreshReceiver::class.java).apply {
            action = MIDNIGHT_REFRESH_ACTION
        }

        return PendingIntent.getBroadcast(
            context,
            MIDNIGHT_REFRESH_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    fun scheduleNextMidnightRefresh(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pendingIntent = midnightRefreshIntent(context)

        val triggerAtMillis = Calendar.getInstance().run {
            add(Calendar.DAY_OF_YEAR, 1)
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
            timeInMillis
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
        }
    }

    fun triggerWidgetUpdate(context: Context) {
        sendWidgetUpdate(context, BirthdayUpcoming::class.java)
        sendWidgetUpdate(context, BirthdayFavorites::class.java)
    }

    private fun sendWidgetUpdate(context: Context, providerClass: Class<*>) {
        val manager = AppWidgetManager.getInstance(context)
        val component = ComponentName(context, providerClass)
        val appWidgetIds = manager.getAppWidgetIds(component)
        if (appWidgetIds.isEmpty()) return

        val updateIntent = Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE).apply {
            setComponent(component)
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds)
        }

        context.sendBroadcast(updateIntent)
    }
}
