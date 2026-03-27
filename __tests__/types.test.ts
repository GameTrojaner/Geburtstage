import { DEFAULT_SETTINGS, AppSettings, NotificationSetting } from '../src/types';

describe('DEFAULT_SETTINGS', () => {
  it('has correct default values', () => {
    expect(DEFAULT_SETTINGS.theme).toBe('system');
    expect(DEFAULT_SETTINGS.language).toBe('system');
    expect(DEFAULT_SETTINGS.notificationsEnabled).toBe(true);
    expect(DEFAULT_SETTINGS.defaultNotificationOffsets).toEqual([0]);
    expect(DEFAULT_SETTINGS.defaultNotificationTime).toBe('09:00');
    expect(DEFAULT_SETTINGS.confirmBeforeWriting).toBe(true);
  });

  it('defaultNotificationOffsets contains same-day (0)', () => {
    expect(DEFAULT_SETTINGS.defaultNotificationOffsets).toContain(0);
  });
});

describe('Type structures', () => {
  it('AppSettings can be created with all fields', () => {
    const settings: AppSettings = {
      theme: 'dark',
      language: 'de',
      notificationsEnabled: false,
      defaultNotificationOffsets: [0, 1, 7],
      defaultNotificationTime: '08:00',
      confirmBeforeWriting: false,
    };
    expect(settings.theme).toBe('dark');
    expect(settings.defaultNotificationOffsets).toHaveLength(3);
  });

  it('NotificationSetting can be created', () => {
    const ns: NotificationSetting = {
      contactId: 'abc123',
      enabled: true,
      offsets: [0, 3],
      time: '10:00',
    };
    expect(ns.contactId).toBe('abc123');
    expect(ns.offsets).toContain(3);
  });
});
