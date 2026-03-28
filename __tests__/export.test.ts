import { ExportData } from '../src/services/database';
import { AppSettings, DEFAULT_SETTINGS } from '../src/types';
import { sanitizeImportData } from '../src/utils/importSanitizer';

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

  it('sanitizes imported contact references against existing contacts', () => {
    const data: ExportData = {
      version: 1,
      settings: DEFAULT_SETTINGS,
      notificationSettings: [
        { contactId: 'c1', enabled: true, offsets: [0], time: '09:00' },
        { contactId: 'c2', enabled: false, offsets: [7], time: '09:00' },
      ],
      favorites: ['c1', 'c3', 'c1'],
      pinned: ['c2', 'c4'],
      hidden: ['c1', 'c9', 'c1'],
    };

    const sanitized = sanitizeImportData(data, new Set(['c1', 'c2']));

    expect(sanitized.notificationSettings.map(item => item.contactId)).toEqual(['c1', 'c2']);
    expect(sanitized.favorites).toEqual(['c1']);
    expect(sanitized.pinned).toEqual(['c2']);
    expect(sanitized.hidden).toEqual(['c1']);
  });

  it('keeps all references when no contact set is provided', () => {
    const data: ExportData = {
      version: 1,
      settings: DEFAULT_SETTINGS,
      notificationSettings: [{ contactId: 'x', enabled: true, offsets: [0], time: '09:00' }],
      favorites: ['x'],
      pinned: ['y'],
      hidden: [],
    };

    const sanitized = sanitizeImportData(data);

    expect(sanitized).toEqual(data);
  });
});
