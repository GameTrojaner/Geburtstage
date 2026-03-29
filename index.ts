import React, { useEffect } from 'react';
import { AppRegistry, Platform } from 'react-native';
import { registerRootComponent } from 'expo';
import {
  registerWidgetConfigurationScreen,
  registerWidgetTaskHandler,
} from 'react-native-android-widget';

import App from './App';
import { widgetTaskHandler } from './src/widget/widgetTaskHandler';
import { bootTask } from './src/tasks/bootTask';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Register Android widget tasks as early as possible so headless work can find them.
if (Platform.OS === 'android') {
  // Reschedule all birthday notifications after device reboot.
  AppRegistry.registerHeadlessTask('RescheduleNotifications', () => bootTask);

  registerWidgetTaskHandler(widgetTaskHandler);

  // No real configuration needed — confirm immediately so the widget is added.
  registerWidgetConfigurationScreen(({ widgetInfo, renderWidget, setResult }) => {
    useEffect(() => {
      widgetTaskHandler({
        widgetAction: 'WIDGET_ADDED',
        widgetInfo,
        renderWidget,
      } as any)
        .then(() => setResult('ok'))
        .catch(() => setResult('ok'));
    }, [widgetInfo, renderWidget, setResult]);

    return React.createElement(React.Fragment, null);
  });
}
