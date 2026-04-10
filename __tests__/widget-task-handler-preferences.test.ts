jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  Appearance: {
    getColorScheme: jest.fn(() => 'light'),
  },
}));

jest.mock('../src/services/database', () => ({
  getSettings: jest.fn(),
}));

import { Appearance } from 'react-native';
import { getSettings } from '../src/services/database';
import { resolveWidgetPreferences } from '../src/widget/preferences';

describe('resolveWidgetPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses explicit dark theme from settings', async () => {
    (getSettings as jest.Mock).mockResolvedValue({ theme: 'dark', widgetMaxEntries: 7 });

    await expect(resolveWidgetPreferences()).resolves.toEqual({ isDark: true, maxEntries: 7 });
  });

  it('uses explicit light theme from settings', async () => {
    (getSettings as jest.Mock).mockResolvedValue({ theme: 'light', widgetMaxEntries: 3 });

    await expect(resolveWidgetPreferences()).resolves.toEqual({ isDark: false, maxEntries: 3 });
  });

  it('uses system theme when settings.theme is system', async () => {
    (getSettings as jest.Mock).mockResolvedValue({ theme: 'system', widgetMaxEntries: 10 });
    (Appearance.getColorScheme as jest.Mock).mockReturnValue('dark');

    await expect(resolveWidgetPreferences()).resolves.toEqual({ isDark: true, maxEntries: 10 });
  });

  it('falls back to appearance + default entries when settings lookup fails', async () => {
    (getSettings as jest.Mock).mockRejectedValue(new Error('db error'));
    (Appearance.getColorScheme as jest.Mock).mockReturnValue('dark');

    await expect(resolveWidgetPreferences()).resolves.toEqual({ isDark: true, maxEntries: 5 });
  });
});
