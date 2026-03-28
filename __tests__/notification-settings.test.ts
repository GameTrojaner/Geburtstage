import { DEFAULT_SETTINGS } from '../src/types';
import {
  buildNotificationSettingForContact,
  isValidNotificationTime,
} from '../src/utils/notificationSettings';

describe('notification settings helpers', () => {
  it('validates HH:mm times', () => {
    expect(isValidNotificationTime('00:00')).toBe(true);
    expect(isValidNotificationTime('23:59')).toBe(true);
    expect(isValidNotificationTime('24:00')).toBe(false);
    expect(isValidNotificationTime('9:00')).toBe(false);
    expect(isValidNotificationTime('12:60')).toBe(false);
  });

  it('builds custom notification payload', () => {
    const payload = buildNotificationSettingForContact(
      'c1',
      true,
      true,
      [30],
      '08:30',
      DEFAULT_SETTINGS
    );

    expect(payload).toEqual({
      contactId: 'c1',
      enabled: true,
      offsets: [30],
      time: '08:30',
    });
  });

  it('builds disabled payload without requiring birthday updates', () => {
    const payload = buildNotificationSettingForContact(
      'c1',
      false,
      false,
      [],
      '09:00',
      DEFAULT_SETTINGS
    );

    expect(payload).toEqual({
      contactId: 'c1',
      enabled: false,
      offsets: DEFAULT_SETTINGS.defaultNotificationOffsets,
      time: DEFAULT_SETTINGS.defaultNotificationTime,
    });
  });

  it('returns null when defaults should be used', () => {
    const payload = buildNotificationSettingForContact(
      'c1',
      true,
      false,
      [],
      '09:00',
      DEFAULT_SETTINGS
    );

    expect(payload).toBeNull();
  });
});
