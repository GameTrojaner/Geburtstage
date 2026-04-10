package io.github.gametrojaner.geburtstage

import android.content.Context

object BootRescheduleState {
    private const val PREFS_NAME = "boot_reschedule_state"
    private const val KEY_PENDING = "pending_reschedule"

    fun markPending(context: Context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_PENDING, true)
            .apply()
    }

    fun consumePending(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val pending = prefs.getBoolean(KEY_PENDING, false)
        if (pending) {
            prefs.edit().putBoolean(KEY_PENDING, false).apply()
        }
        return pending
    }
}