package io.github.gametrojaner.geburtstage

import android.app.job.JobInfo
import android.app.job.JobScheduler
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * Receives system boot and time-change events, then schedules notification reschedule via JobScheduler.
 *
 * Replaces the old approach of starting a Foreground Service (which required FOREGROUND_SERVICE_DATA_SYNC).
 * JobScheduler is system-managed and doesn't require special permissions.
 *
 * The job runs asynchronously (may be delayed by system scheduling), but this is acceptable since
 * the goal is to eventually reschedule all notifications, not immediately.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON" -> {
                scheduleNotificationReschedule(context)
                handleWidgetRefresh(context)
            }
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED,
            Intent.ACTION_DATE_CHANGED -> {
                scheduleNotificationReschedule(context)
                handleWidgetRefresh(context)
            }
            else -> return
        }
    }

    private fun scheduleNotificationReschedule(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
            // JobScheduler not available on API < 21
            return
        }

        val jobScheduler = context.getSystemService(Context.JOB_SCHEDULER_SERVICE) as JobScheduler

        // Cancel any existing job
        jobScheduler.cancel(RescheduleNotificationsJob.JOB_ID)

        // Create new job
        val jobInfo = JobInfo.Builder(
            RescheduleNotificationsJob.JOB_ID,
            ComponentName(context, RescheduleNotificationsJob::class.java)
        ).apply {
            // Run ASAP, but system may delay if device is busy
            setMinimumLatency(0)
            setOverrideDeadline(5000)  // Must run within 5 seconds at the latest

            // Persist job across reboot (API 31+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                setPersisted(true)
            }
        }.build()

        jobScheduler.schedule(jobInfo)
    }

    private fun handleWidgetRefresh(context: Context) {
        if (WidgetRefreshScheduler.hasAnyWidgetInstances(context)) {
            WidgetRefreshScheduler.triggerWidgetUpdate(context)
            WidgetRefreshScheduler.scheduleNextMidnightRefresh(context)
        } else {
            WidgetRefreshScheduler.cancelMidnightRefresh(context)
        }
    }
}
