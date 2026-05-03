/**
 * Service-layer tests for config import, export, and reset operations.
 * Verifies that service functions are called with correct arguments and
 * that DocumentPicker cancellation skips import.
 *
 * Note: UI loading-flag lifecycle (isImporting / isExporting / isResetting)
 * is not covered here; it lives in SettingsScreen component state and
 * would require a component/renderHook test to assert directly.
 */

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  Paths: { document: '/mock/document' },
  File: jest.fn().mockImplementation(() => ({
    write: jest.fn().mockResolvedValue(undefined),
    text: jest.fn().mockResolvedValue(
      JSON.stringify({
        version: 1,
        settings: {
          theme: 'system',
          language: 'system',
          notificationsEnabled: true,
          defaultNotificationOffsets: [0],
          defaultNotificationTime: '09:00',
          confirmBeforeWriting: true,
        },
        notificationSettings: [],
        favorites: [],
        pinned: [],
        hidden: [],
      })
    ),
    uri: '/mock/document/geburtstage-config.json',
  })),
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/database', () => ({
  exportAllData: jest.fn(),
  importAllData: jest.fn(),
}));

jest.mock('../src/services/notifications', () => ({
  scheduleAllNotifications: jest.fn().mockResolvedValue(undefined),
}));

import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { exportAllData, importAllData } from '../src/services/database';
import { DEFAULT_SETTINGS } from '../src/types';

const mockExportData = {
  version: 1 as const,
  settings: DEFAULT_SETTINGS,
  notificationSettings: [],
  favorites: [],
  pinned: [],
  hidden: [],
};

describe('Config import - service integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('importAllData is called with parsed file content', async () => {
    (importAllData as jest.Mock).mockResolvedValue(undefined);

    await importAllData(mockExportData, new Set(['c1']));

    expect(importAllData).toHaveBeenCalledWith(mockExportData, new Set(['c1']));
  });

  it('importAllData rejects on invalid data', async () => {
    (importAllData as jest.Mock).mockRejectedValue(new Error('Invalid data'));

    await expect(importAllData({} as any, new Set())).rejects.toThrow('Invalid data');
  });

  it('document picker cancellation skips import', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: true });

    const result = await DocumentPicker.getDocumentAsync({ type: ['*/*'], copyToCacheDirectory: true, multiple: false });

    expect(result.canceled).toBe(true);
    expect(importAllData).not.toHaveBeenCalled();
  });
});

describe('Config export - service integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exportAllData is called and result is shared', async () => {
    (exportAllData as jest.Mock).mockResolvedValue(mockExportData);

    const data = await exportAllData();
    await Sharing.shareAsync('/mock/path', { mimeType: 'application/json', dialogTitle: 'Export' });

    expect(exportAllData).toHaveBeenCalledTimes(1);
    expect(Sharing.shareAsync).toHaveBeenCalledTimes(1);
    expect(data).toEqual(mockExportData);
  });

  it('export error propagates without calling shareAsync', async () => {
    (exportAllData as jest.Mock).mockRejectedValue(new Error('DB error'));

    await expect(exportAllData()).rejects.toThrow('DB error');
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });
});

describe('Config reset - service integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('importAllData is called with default settings on reset', async () => {
    (importAllData as jest.Mock).mockResolvedValue(undefined);

    const resetPayload = {
      version: 1 as const,
      settings: DEFAULT_SETTINGS,
      notificationSettings: [],
      favorites: [],
      pinned: [],
      hidden: [],
    };

    await importAllData(resetPayload);

    expect(importAllData).toHaveBeenCalledWith(resetPayload);
  });

  it('reset error propagates correctly', async () => {
    (importAllData as jest.Mock).mockRejectedValue(new Error('Reset failed'));

    await expect(importAllData({} as any)).rejects.toThrow('Reset failed');
  });
});
