package io.github.gametrojaner.geburtstage

import android.app.job.JobInfo
import android.app.job.JobScheduler
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

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
        // Native alarms are cleared on reboot; replay persisted schedule payloads immediately.
        LocalNotificationsNativeModule.reschedulePersistedNotifications(context)

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
            // JobScheduler not available on API < 21
            BootRescheduleState.markPending(context)
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
            setOverrideDeadline(5000)  // Request execution within ~5 s; this is best-effort and system-managed

            setPersisted(true)
        }.build()

        val scheduleResult = jobScheduler.schedule(jobInfo)
        if (scheduleResult != JobScheduler.RESULT_SUCCESS) {
            // Fallback: keep behavior safe even if scheduler rejects the job.
            Log.w(TAG, "JobScheduler rejected boot reschedule job, setting pending flag directly")
            BootRescheduleState.markPending(context)
        }
    }

    private fun handleWidgetRefresh(context: Context) {
        if (WidgetRefreshScheduler.hasAnyWidgetInstances(context)) {
            WidgetRefreshScheduler.triggerWidgetUpdate(context)
            WidgetRefreshScheduler.scheduleNextMidnightRefresh(context)
        } else {
            WidgetRefreshScheduler.cancelMidnightRefresh(context)
        }
    }

    companion object {
        private const val TAG = "BootReceiver"
    }
}
