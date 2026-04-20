jest.mock('react-native', () => ({
  NativeModules: {
    LocalNotifications: {
      areNotificationsEnabled: jest.fn(),
      setupBirthdayChannel: jest.fn(),
      cancelAllScheduledNotifications: jest.fn(),
      scheduleNotificationAt: jest.fn(),
    },
  },
  PermissionsAndroid: {
    PERMISSIONS: { POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS' },
    RESULTS: { GRANTED: 'granted', DENIED: 'denied' },
    request: jest.fn(),
  },
  Platform: {
    OS: 'android',
    Version: 34,
  },
}));

jest.mock('../src/services/database', () => ({
  getAllNotificationSettings: jest.fn(),
  getSettings: jest.fn(),
}));

jest.mock('../src/i18n', () => ({
  __esModule: true,
  default: { t: (_key: string, opts?: Record<string, unknown>) => String(opts?.days ?? '') },
}));

import { getNotificationLeadDays } from '../src/services/notifications';
import {
  requestNotificationPermission,
  scheduleAllNotifications,
  setupNotificationChannel,
} from '../src/services/notifications';
import { getAllNotificationSettings, getSettings } from '../src/services/database';

function getNativeMocks() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const rn = require('react-native');
  return {
    areNotificationsEnabled: rn.NativeModules.LocalNotifications.areNotificationsEnabled as jest.Mock,
    setupBirthdayChannel: rn.NativeModules.LocalNotifications.setupBirthdayChannel as jest.Mock,
    cancelAllScheduledNotifications: rn.NativeModules.LocalNotifications
      .cancelAllScheduledNotifications as jest.Mock,
    scheduleNotificationAt: rn.NativeModules.LocalNotifications.scheduleNotificationAt as jest.Mock,
    permissionsRequest: rn.PermissionsAndroid.request as jest.Mock,
  };
}

describe('notifications service helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const mocks = getNativeMocks();
    mocks.areNotificationsEnabled.mockResolvedValue(true);
    mocks.setupBirthdayChannel.mockResolvedValue(undefined);
    mocks.cancelAllScheduledNotifications.mockResolvedValue(undefined);
    mocks.scheduleNotificationAt.mockResolvedValue(1);
    mocks.permissionsRequest.mockResolvedValue('granted');
  });

  it('returns 1 day for previous evening reminder', () => {
    const nextBday = new Date(2026, 2, 29, 0, 0, 0); // 2026-03-29
    const notifDate = new Date(2026, 2, 28, 23, 30, 0); // 2026-03-28 23:30
    expect(getNotificationLeadDays(nextBday, notifDate)).toBe(1);
  });

  it('returns 0 for same calendar day even if times differ', () => {
    const nextBday = new Date(2026, 2, 29, 0, 0, 0);
    const notifDate = new Date(2026, 2, 29, 8, 30, 0);
    expect(getNotificationLeadDays(nextBday, notifDate)).toBe(0);
  });

  it('returns full calendar-day difference for multi-day offsets', () => {
    const nextBday = new Date(2026, 3, 10, 0, 0, 0); // Apr 10
    const notifDate = new Date(2026, 3, 7, 23, 0, 0); // Apr 7
    expect(getNotificationLeadDays(nextBday, notifDate)).toBe(3);
  });

  it('requests POST_NOTIFICATIONS on Android 13+ and returns false when denied', async () => {
    const mocks = getNativeMocks();
    mocks.permissionsRequest.mockResolvedValue('denied');

    const granted = await requestNotificationPermission();

    expect(granted).toBe(false);
    expect(mocks.permissionsRequest).toHaveBeenCalled();
    expect(mocks.areNotificationsEnabled).not.toHaveBeenCalled();
  });

  it('sets up native birthday notification channel', async () => {
    const mocks = getNativeMocks();
    await setupNotificationChannel();

    expect(mocks.setupBirthdayChannel).toHaveBeenCalledTimes(1);
  });

  it('schedules notifications via native module for upcoming birthdays', async () => {
    const mocks = getNativeMocks();
    (getSettings as jest.Mock).mockResolvedValue({
      notificationsEnabled: true,
      defaultNotificationOffsets: [0],
      defaultNotificationTime: '23:59',
    });
    (getAllNotificationSettings as jest.Mock).mockResolvedValue([]);

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    await scheduleAllNotifications([
      {
        contactId: 'c1',
        name: 'Alice',
        birthday: {
          day: tomorrow.getDate(),
          month: tomorrow.getMonth() + 1,
          year: 1990,
        },
      },
    ]);

    expect(mocks.cancelAllScheduledNotifications).toHaveBeenCalledTimes(1);
    expect(mocks.scheduleNotificationAt).toHaveBeenCalledTimes(1);
    const [timestamp, title, body, contactId] = mocks.scheduleNotificationAt.mock.calls[0];
    expect(typeof timestamp).toBe('number');
    expect(typeof title).toBe('string');
    expect(typeof body).toBe('string');
    expect(contactId).toBe('c1');
  });

  it('skips POST_NOTIFICATIONS request on Android < 13 and returns areNotificationsEnabled result', async () => {
    const rn = require('react-native');
    const originalVersion = rn.Platform.Version;
    rn.Platform.Version = 28;

    const mocks = getNativeMocks();
    mocks.areNotificationsEnabled.mockResolvedValue(true);

    const granted = await requestNotificationPermission();

    expect(granted).toBe(true);
    expect(mocks.permissionsRequest).not.toHaveBeenCalled();
    expect(mocks.areNotificationsEnabled).toHaveBeenCalledTimes(1);

    rn.Platform.Version = originalVersion;
  });

  it('returns false on iOS where native LocalNotifications module is not available', async () => {
    const rn = require('react-native');
    const originalOs = rn.Platform.OS;
    rn.Platform.OS = 'ios';

    try {
      const granted = await requestNotificationPermission();
      expect(granted).toBe(false);
    } finally {
      rn.Platform.OS = originalOs;
    }
  });

  it("schedules a same-day birthday for today, not next year, regardless of current time", async () => {
    // Regression for: getNextBirthday used `next < now` (datetime) instead of `next < today`
    // (date-only), causing today's birthday to be advanced to next year any time after midnight.
    const mocks = getNativeMocks();
    (getSettings as jest.Mock).mockResolvedValue({
      notificationsEnabled: true,
      defaultNotificationOffsets: [0],
      defaultNotificationTime: '23:59',
    });
    (getAllNotificationSettings as jest.Mock).mockResolvedValue([]);

    const now = new Date();

    await scheduleAllNotifications([
      {
        contactId: 'today-bd',
        name: 'Birthday Person',
        birthday: {
          day: now.getDate(),
          month: now.getMonth() + 1,
          year: 1990,
        },
      },
    ]);

    // scheduleNotificationAt must have been called — the notification must be for THIS year,
    // not skipped (which would happen if getNextBirthday incorrectly advanced to next year and
    // the next-year date fell outside the maxDaysAhead window).
    expect(mocks.scheduleNotificationAt).toHaveBeenCalledTimes(1);

    const [timestamp] = mocks.scheduleNotificationAt.mock.calls[0];
    const scheduledDate = new Date(timestamp);
    // The notification must land in the current calendar year (not next year).
    expect(scheduledDate.getFullYear()).toBe(now.getFullYear());
    // And it must be on today's date.
    expect(scheduledDate.getMonth()).toBe(now.getMonth());
    expect(scheduledDate.getDate()).toBe(now.getDate());
  });
});
