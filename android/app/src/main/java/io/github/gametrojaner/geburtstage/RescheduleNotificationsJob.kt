package io.github.gametrojaner.geburtstage

import android.app.job.JobParameters
import android.app.job.JobService

/**
 * JobService that marks notification reschedule as pending after device boot/time events.
 *
 * The actual reschedule work is performed by JS on the next app start, so no foreground
 * service is required and Play Console foreground-service disclosures are avoided.
 */
class RescheduleNotificationsJob : JobService() {

    override fun onStartJob(params: JobParameters?): Boolean {
        BootRescheduleState.markPending(this)
        return false
    }

    override fun onStopJob(params: JobParameters?): Boolean {
        return false
    }

    companion object {
        const val JOB_ID = 9002  // Unique ID for this job
    }
}
