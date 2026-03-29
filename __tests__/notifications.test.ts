jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'Standalone' },
  ExecutionEnvironment: { StoreClient: 'StoreClient' },
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

describe('notifications service helpers', () => {
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
});
