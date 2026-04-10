import { Appearance } from 'react-native';
import { getSettings } from '../services/database';
import { normalizeWidgetMaxEntries } from './maxEntries';

export async function resolveWidgetPreferences(): Promise<{ isDark: boolean; maxEntries: number }> {
  let isDark = false;
  let maxEntries = 5;

  try {
    const settings = await getSettings();
    maxEntries = normalizeWidgetMaxEntries(settings.widgetMaxEntries, 5);
    if (settings.theme === 'dark') {
      isDark = true;
    } else if (settings.theme === 'light') {
      isDark = false;
    } else {
      isDark = Appearance.getColorScheme() === 'dark';
    }
  } catch {
    isDark = Appearance.getColorScheme() === 'dark';
  }

  return { isDark, maxEntries };
}
