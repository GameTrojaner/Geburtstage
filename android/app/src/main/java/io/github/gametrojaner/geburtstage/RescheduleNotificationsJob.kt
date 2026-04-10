package io.github.gametrojaner.geburtstage

import android.app.job.JobParameters
import android.app.job.JobService
import android.os.Build
import android.os.PersistableBundle
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * JobService that reschedules birthday notifications after device boot or system events.
 *
 * Replaces the old BootTaskService (Foreground Service) with a system-managed JobService.
 * This eliminates the need for FOREGROUND_SERVICE_DATA_SYNC permission while maintaining
 * the same reschedule functionality.
 *
 * The job is scheduled by BootReceiver on:
 * - BOOT_COMPLETED
 * - QUICKBOOT_POWERON
 * - TIME_SET, TIMEZONE_CHANGED, DATE_CHANGED
 *
 * Job execution runs asynchronously. On API 31+, jobs are throttled to run at most once
 * per ~10 minutes unless marked as expedited. For this use case, a small delay is acceptable
 * as long as reschedule happens reliably.
 */
class RescheduleNotificationsJob : JobService() {

    override fun onStartJob(params: JobParameters?): Boolean {
        // Return true to indicate work is still in progress (will call jobFinished later)
        // Return false means work is done immediately
        
        // Start the actual reschedule work on a background thread
        Thread {
            try {
                rescheduleNotifications()
            } finally {
                // Must call jobFinished to let system know the job is complete
                jobFinished(params, false)  // false = don't reschedule on failure
            }
        }.start()

        return true  // Work is ongoing
    }

    override fun onStopJob(params: JobParameters?): Boolean {
        // Called if the system needs to kill the job before it finishes
        // Return true to reschedule the job, false to abandon it
        return true  // Reschedule on next opportunity
    }

    private fun rescheduleNotifications() {
        // Acquire wake lock to keep device awake
        HeadlessJsTaskService.acquireWakeLockNow(this)

        try {
            // Create and execute the HeadlessJsTask exactly like BootTaskService did
            val taskConfig = HeadlessJsTaskConfig(
                "RescheduleNotifications",
                Arguments.createMap(),
                90_000,  // JS task timeout in ms
                true,    // allowed to run while app is in foreground
            )

            // Execute the task synchronously
            val result = HeadlessJsTaskService.executeTask(this, taskConfig)
            if (!result) {
                throw RuntimeException("RescheduleNotifications task returned false")
            }
        } catch (e: Exception) {
            android.util.Log.e(TAG, "Error rescheduling notifications", e)
        } finally {
            HeadlessJsTaskService.releaseWakeLock(this)
        }
    }

    companion object {
        private const val TAG = "RescheduleNotificationsJob"
        const val JOB_ID = 9002  // Unique ID for this job
    }
}
