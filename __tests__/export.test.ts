import { ExportData } from '../src/services/database';
import { AppSettings, DEFAULT_SETTINGS } from '../src/types';

/**
 * Test the export/import data format validation.
 * We cannot test the actual SQLite operations in a Node.js environment,
 * but we can validate the data structures.
 */

describe('ExportData format', () => {
  it('has correct version', () => {
    const data: ExportData = {
      version: 1,
      settings: DEFAULT_SETTINGS,
      notificationSettings: [],
      favorites: [],
      pinned: [],
      hidden: [],
    };
    expect(data.version).toBe(1);
  });

  it('can serialize and deserialize to JSON', () => {
    const data: ExportData = {
      version: 1,
      settings: {
        theme: 'dark',
        language: 'de',
        notificationsEnabled: true,
        defaultNotificationOffsets: [0, 1, 7],
        defaultNotificationTime: '08:00',
        confirmBeforeWriting: false,
      },
      notificationSettings: [
        { contactId: 'c1', enabled: true, offsets: [0, 3], time: '09:00' },
        { contactId: 'c2', enabled: false, offsets: [0], time: '10:00' },
      ],
      favorites: ['c1', 'c3'],
      pinned: ['c2'],
      hidden: [],
    };

    const json = JSON.stringify(data);
    const parsed: ExportData = JSON.parse(json);

    expect(parsed.version).toBe(1);
    expect(parsed.settings.theme).toBe('dark');
    expect(parsed.notificationSettings).toHaveLength(2);
    expect(parsed.favorites).toContain('c1');
    expect(parsed.pinned).toContain('c2');
  });

  it('preserves notification offsets order', () => {
    const data: ExportData = {
      version: 1,
      settings: DEFAULT_SETTINGS,
      notificationSettings: [
        { contactId: 'c1', enabled: true, offsets: [0, 1, 3, 7, 14], time: '09:00' },
      ],
      favorites: [],
      pinned: [],
      hidden: [],
    };

    const json = JSON.stringify(data);
    const parsed: ExportData = JSON.parse(json);
    expect(parsed.notificationSettings[0].offsets).toEqual([0, 1, 3, 7, 14]);
  });
});
