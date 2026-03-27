import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Register Android widget task handler (Android only)
if (Platform.OS === 'android') {
  import('react-native-android-widget').then(({ registerWidgetTaskHandler }) => {
    import('./src/widget/widgetTaskHandler').then(({ widgetTaskHandler }) => {
      registerWidgetTaskHandler(widgetTaskHandler);
    });
  });
}
