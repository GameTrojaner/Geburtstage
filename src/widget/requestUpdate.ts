import { Platform } from 'react-native';

const WIDGET_NAMES = ['BirthdayUpcoming', 'BirthdayFavorites'] as const;

let queuedRefreshTimeout: ReturnType<typeof setTimeout> | null = null;
let inFlightRefresh = false;

export async function refreshAllWidgetsNow(): Promise<void> {
  if (Platform?.OS !== 'android' || inFlightRefresh) {
    return;
  }

  inFlightRefresh = true;
  try {
    const { requestWidgetUpdate } = require('react-native-android-widget') as typeof import('react-native-android-widget');
    const { renderWidgetForName } = require('./widgetTaskHandler') as typeof import('./widgetTaskHandler');

    for (const widgetName of WIDGET_NAMES) {
      await requestWidgetUpdate({
        widgetName,
        renderWidget: (info) => renderWidgetForName(info.widgetName),
      });
    }
  } catch (error) {
    console.error('Widget refresh error:', error);
  } finally {
    inFlightRefresh = false;
  }
}

export function queueWidgetRefresh(delayMs = 300): void {
  if (Platform?.OS !== 'android') {
    return;
  }

  if (queuedRefreshTimeout) {
    clearTimeout(queuedRefreshTimeout);
  }

  queuedRefreshTimeout = setTimeout(() => {
    queuedRefreshTimeout = null;
    void refreshAllWidgetsNow();
  }, delayMs);
}
