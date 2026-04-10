package io.github.gametrojaner.geburtstage.widget;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import io.github.gametrojaner.geburtstage.WidgetRefreshScheduler;
import com.reactnativeandroidwidget.RNWidgetProvider;

public class BirthdayFavorites extends RNWidgetProvider {
	@Override
	public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
		super.onUpdate(context, appWidgetManager, appWidgetIds);
		WidgetRefreshScheduler.INSTANCE.scheduleNextMidnightRefresh(context);
	}

	@Override
	public void onDisabled(Context context) {
		super.onDisabled(context);
		WidgetRefreshScheduler.INSTANCE.cancelMidnightRefresh(context);
	}
}
