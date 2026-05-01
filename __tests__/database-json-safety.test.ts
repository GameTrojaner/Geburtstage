/**
 * Regression tests for JSON.parse safety in database.ts
 *
 * Verifies that malformed JSON stored in the database (e.g., from corruption
 * or a forward-compatibility edge case) never crashes getSettings /
 * getNotificationSetting / getAllNotificationSettings — they must silently
 * fall back to safe defaults.
 *
 * Each test resets the module registry so the database.ts singleton (`db`)
 * starts fresh and picks up our per-test mock configuration.
 */

// Must be at top-level so Jest hoists them before any import.
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('../src/widget/maxEntries', () => ({
  normalizeWidgetMaxEntries: (_v: unknown, def: number) => def,
}));

import { DEFAULT_SETTINGS } from '../src/types';

function makeMockDb(overrides: Partial<{
  execAsync: jest.Mock;
  getFirstAsync: jest.Mock;
  getAllAsync: jest.Mock;
  runAsync: jest.Mock;
}> = {}) {
  return {
    execAsync: jest.fn().mockResolvedValue(undefined),
    getFirstAsync: jest.fn().mockResolvedValue({ ok: 1 }),
    getAllAsync: jest.fn().mockResolvedValue([]),
    runAsync: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// Re-load database module from scratch before each test so the module-level
// `db` singleton is null and picks up the fresh mock returned by openDatabaseAsync.
let getSettings: typeof import('../src/services/database').getSettings;
let getNotificationSetting: typeof import('../src/services/database').getNotificationSetting;
let getAllNotificationSettings: typeof import('../src/services/database').getAllNotificationSettings;
let openDatabaseAsync: jest.Mock;

beforeEach(() => {
  jest.resetModules();
  // Re-require after reset — mocks are still registered (resetModules only clears
  // the module registry, not the mock definitions).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  openDatabaseAsync = require('expo-sqlite').openDatabaseAsync;
  openDatabaseAsync.mockReset();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const db = require('../src/services/database');
  getSettings = db.getSettings;
  getNotificationSetting = db.getNotificationSetting;
  getAllNotificationSettings = db.getAllNotificationSettings;
});

describe('database JSON.parse safety', () => {
  it('getSettings falls back to default offsets when stored JSON is malformed', async () => {
    openDatabaseAsync.mockResolvedValue(makeMockDb({
      getAllAsync: jest.fn().mockResolvedValue([
        { key: 'defaultNotificationOffsets', value: '[invalid json' },
        { key: 'notificationsEnabled', value: 'true' },
      ]),
    }));

    const settings = await getSettings();

    expect(settings.defaultNotificationOffsets).toEqual(DEFAULT_SETTINGS.defaultNotificationOffsets);
  });

  it('getSettings parses valid offsets correctly', async () => {
    openDatabaseAsync.mockResolvedValue(makeMockDb({
      getAllAsync: jest.fn().mockResolvedValue([
        { key: 'defaultNotificationOffsets', value: '[0,7,14]' },
      ]),
    }));

    const settings = await getSettings();

    expect(settings.defaultNotificationOffsets).toEqual([0, 7, 14]);
  });

  it('getNotificationSetting falls back to [0] when offsets JSON is malformed', async () => {
    const db = makeMockDb({
      getFirstAsync: jest.fn()
        .mockResolvedValueOnce({ ok: 1 }) // health-check ping
        .mockResolvedValueOnce({
          contact_id: 'c1',
          enabled: 1,
          offsets: '{broken',
          time: '09:00',
        }),
    });
    openDatabaseAsync.mockResolvedValue(db);

    const setting = await getNotificationSetting('c1');

    expect(setting).not.toBeNull();
    expect(setting!.offsets).toEqual([0]);
  });

  it('getAllNotificationSettings falls back to [0] for any malformed row', async () => {
    openDatabaseAsync.mockResolvedValue(makeMockDb({
      getAllAsync: jest.fn().mockResolvedValue([
        { contact_id: 'c1', enabled: 1, offsets: '[0,7]', time: '09:00' },
        { contact_id: 'c2', enabled: 0, offsets: 'not-json', time: '10:00' },
      ]),
    }));

    const settings = await getAllNotificationSettings();

    expect(settings).toHaveLength(2);
    expect(settings[0].offsets).toEqual([0, 7]);
    expect(settings[1].offsets).toEqual([0]);
  });
});
