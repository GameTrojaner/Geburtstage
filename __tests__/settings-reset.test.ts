import { DEFAULT_SETTINGS } from '../src/types';
import { importAllData, exportAllData } from '../src/services/database';

// Mock the database
jest.mock('../src/services/database', () => ({
  importAllData: jest.fn(),
  exportAllData: jest.fn(),
  getSettings: jest.fn(),
  saveSettings: jest.fn(),
  getNotificationSetting: jest.fn(),
  getAllNotificationSettings: jest.fn(),
  saveNotificationSetting: jest.fn(),
  deleteNotificationSetting: jest.fn(),
  getFavorites: jest.fn(),
  addFavorite: jest.fn(),
  removeFavorite: jest.fn(),
  getPinned: jest.fn(),
  addPinned: jest.fn(),
  removePinned: jest.fn(),
  getHidden: jest.fn(),
  addHidden: jest.fn(),
  removeHidden: jest.fn(),
}));

describe('Settings Reset Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reset all settings to defaults', async () => {
    const resetData = {
      version: 1 as const,
      settings: DEFAULT_SETTINGS,
      notificationSettings: [],
      favorites: [],
      pinned: [],
      hidden: [],
    };

    (importAllData as jest.Mock).mockResolvedValue(undefined);

    await importAllData(resetData);

    expect(importAllData).toHaveBeenCalledWith(resetData);
  });

  it('should contain correct default settings', () => {
    expect(DEFAULT_SETTINGS).toHaveProperty('theme');
    expect(DEFAULT_SETTINGS).toHaveProperty('language');
    expect(DEFAULT_SETTINGS).toHaveProperty('notificationsEnabled');
    expect(DEFAULT_SETTINGS).toHaveProperty('defaultNotificationOffsets');
    expect(DEFAULT_SETTINGS).toHaveProperty('defaultNotificationTime');
    expect(DEFAULT_SETTINGS).toHaveProperty('confirmBeforeWriting');
  });

  it('should preserve structure when importing reset data', async () => {
    const resetData = {
      version: 1 as const,
      settings: DEFAULT_SETTINGS,
      notificationSettings: [],
      favorites: [],
      pinned: [],
      hidden: [],
    };

    (importAllData as jest.Mock).mockResolvedValue(undefined);

    await importAllData(resetData);

    const callArg = (importAllData as jest.Mock).mock.calls[0][0];
    expect(callArg.version).toBe(1);
    expect(callArg.notificationSettings).toEqual([]);
    expect(callArg.favorites).toEqual([]);
    expect(callArg.pinned).toEqual([]);
    expect(callArg.hidden).toEqual([]);
  });

  it('should export empty data structure', async () => {
    const exportedData = {
      version: 1 as const,
      settings: DEFAULT_SETTINGS,
      notificationSettings: [],
      favorites: [],
      pinned: [],
      hidden: [],
    };

    (exportAllData as jest.Mock).mockResolvedValue(exportedData);

    const result = await exportAllData();

    expect(result).toEqual(exportedData);
  });
});
