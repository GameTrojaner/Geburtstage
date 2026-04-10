package io.github.gametrojaner.geburtstage

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Receives the scheduled midnight alarm and triggers widget redraw.
 * Reschedules itself for the next midnight to keep daily rollovers reliable.
 */
class WidgetRefreshReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        WidgetRefreshScheduler.triggerWidgetUpdate(context)
        WidgetRefreshScheduler.scheduleNextMidnightRefresh(context)
    }
}
