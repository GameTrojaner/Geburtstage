import React, { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { lightTheme, darkTheme } from './src/theme';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useAppStore } from './src/store';
import { setupNotificationChannel, requestNotificationPermission } from './src/services/notifications';
import { warmupDb } from './src/services/database';
import './src/i18n';
import i18n from './src/i18n';

export default function App() {
  const systemColorScheme = useColorScheme();
  const {
    settings,
    loadSettings,
    loadContacts,
    loadFavorites,
    loadPinned,
    loadHidden,
    loadNotificationSettings,
    rescheduleNotifications,
    hasContactsPermission,
  } = useAppStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Warm up the DB first so all subsequent operations share a ready connection.
        await warmupDb();
        await loadSettings();
        await loadFavorites();
        await loadPinned();
        await loadHidden();
        await loadNotificationSettings();
        await setupNotificationChannel();
        await requestNotificationPermission();
      } catch (e) {
        console.warn('Init error (non-fatal):', e);
      }
      setInitialized(true);
    })();
  }, []);

  // Re-sync language when settings change
  useEffect(() => {
    if (settings.language === 'system') {
      // Detect device language and apply it
      const locales = require('expo-localization').getLocales();
      const lang = locales?.[0]?.languageCode;
      i18n.changeLanguage(lang === 'de' || lang === 'en' ? lang : 'en');
    } else {
      i18n.changeLanguage(settings.language);
    }
  }, [settings.language]);

  // Schedule notifications when contacts are loaded
  useEffect(() => {
    if (hasContactsPermission && initialized) {
      rescheduleNotifications();
    }
  }, [hasContactsPermission, initialized]);

  const isDark = settings.theme === 'system'
    ? systemColorScheme === 'dark'
    : settings.theme === 'dark';

  const theme = isDark ? darkTheme : lightTheme;

  const navigationTheme = {
    dark: isDark,
    colors: {
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.onSurface,
      border: theme.colors.outline,
      notification: theme.colors.error,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' as const },
      medium: { fontFamily: 'System', fontWeight: '500' as const },
      bold: { fontFamily: 'System', fontWeight: '700' as const },
      heavy: { fontFamily: 'System', fontWeight: '900' as const },
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <NavigationContainer theme={navigationTheme}>
            <AppNavigator />
            <StatusBar style={isDark ? 'light' : 'dark'} />
          </NavigationContainer>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
