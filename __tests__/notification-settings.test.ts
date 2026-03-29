import { DEFAULT_SETTINGS } from '../src/types';
import {
  buildNotificationSettingForContact,
  isValidNotificationTime,
  isValidOffsetAmount,
  normalizeLegacyOffsets,
  toNotificationOffset,
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

  it('encodes offsets by unit', () => {
    expect(toNotificationOffset(0, 'days')).toBe(0);
    expect(toNotificationOffset(2, 'weeks')).toBe(14);
    expect(toNotificationOffset(1, 'months')).toBe(-1);
  });

  it('validates offset input amounts by unit', () => {
    expect(isValidOffsetAmount('0', 'days')).toBe(true);
    expect(isValidOffsetAmount('1', 'days')).toBe(true);
    expect(isValidOffsetAmount('-1', 'days')).toBe(false);

    expect(isValidOffsetAmount('0', 'weeks')).toBe(false);
    expect(isValidOffsetAmount('1', 'weeks')).toBe(true);

    expect(isValidOffsetAmount('0', 'months')).toBe(false);
    expect(isValidOffsetAmount('1', 'months')).toBe(true);
  });

  it('migrates legacy 30-day multiples to negative month encoding', () => {
    const { offsets, migrated } = normalizeLegacyOffsets([0, 7, 30, 60, 90]);
    expect(migrated).toBe(true);
    expect(offsets).toEqual([0, 7, -1, -2, -3]);
  });

  it('does not migrate already-normalized offsets', () => {
    const { offsets, migrated } = normalizeLegacyOffsets([0, 7, -1, -2]);
    expect(migrated).toBe(false);
    expect(offsets).toEqual([0, 7, -1, -2]);
  });
});
