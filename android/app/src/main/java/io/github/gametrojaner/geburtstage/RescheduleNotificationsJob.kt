package io.github.gametrojaner.geburtstage

import android.app.job.JobParameters
import android.app.job.JobService
import android.content.Intent
import android.os.Build

/**
 * JobService that reschedules birthday notifications after device boot or system events.
 *
 * Replaces the old Foreground Service (which required FOREGROUND_SERVICE_DATA_SYNC).
 * This JobService delegates the actual work to BootTaskService but avoids mandatory foreground
 * service declarations through JobScheduler's system-managed execution.
 */
class RescheduleNotificationsJob : JobService() {

    override fun onStartJob(params: JobParameters?): Boolean {
        // Start BootTaskService on a background thread to do the actual rescheduling
        Thread {
            try {
                rescheduleNotifications()
            } finally {
                jobFinished(params, false) // Don't reschedule on failure
            }
        }.start()

        return true // Work is ongoing (async)
    }

    override fun onStopJob(params: JobParameters?): Boolean {
        // System is killing the job, ask it to reschedule if possible
        return true
    }

    private fun rescheduleNotifications() {
        val intent = Intent(this, BootTaskService::class.java)
        // Use regular startService instead of startForegroundService
        // The JobService already handles background execution, so we don't need
        // the service to be in foreground
        startService(intent)
    }

    companion object {
        const val JOB_ID = 9002  // Unique ID for this job
    }
}
