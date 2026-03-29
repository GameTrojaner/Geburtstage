import { AppSettings, NotificationSetting } from '../types';

export type NotificationOffsetUnit = 'days' | 'weeks' | 'months';

export function isValidNotificationTime(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export function toNotificationOffset(amount: number, unit: NotificationOffsetUnit): number {
  switch (unit) {
    case 'days':
      return amount;
    case 'weeks':
      return amount * 7;
    // Months are encoded as negative integers (-1 = 1 month, -2 = 2 months, ...)
    // so they can be distinguished from explicit day offsets like 30.
    case 'months':
      return -amount;
  }
}

export function isValidOffsetAmount(value: string, unit: NotificationOffsetUnit): boolean {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return false;
  // Same-day (0) is only valid for explicit day offsets.
  if (unit === 'days') return parsed >= 0;
  return parsed >= 1;
}

/**
 * Legacy migration:
 * prior releases stored month-like offsets as day-multiples (30/60/90).
 * New encoding stores calendar-month offsets as negatives (-1/-2/-3).
 */
export function normalizeLegacyOffsets(offsets: number[]): { offsets: number[]; migrated: boolean } {
  let migrated = false;
  const normalized: number[] = [];
  const seen = new Set<number>();

  for (const offset of offsets) {
    const mapped = offset > 0 && offset % 30 === 0 ? -(offset / 30) : offset;
    if (mapped !== offset) migrated = true;
    if (!seen.has(mapped)) {
      seen.add(mapped);
      normalized.push(mapped);
    } else if (mapped !== offset) {
      migrated = true;
    }
  }

  return { offsets: normalized, migrated };
}

export function buildNotificationSettingForContact(
  contactId: string,
  notifEnabled: boolean,
  useCustomNotif: boolean,
  notifOffsets: number[],
  notifTime: string,
  settings: AppSettings
): NotificationSetting | null {
  if (!notifEnabled || useCustomNotif) {
    return {
      contactId,
      enabled: notifEnabled,
      offsets: useCustomNotif ? notifOffsets : settings.defaultNotificationOffsets,
      time: useCustomNotif ? notifTime : settings.defaultNotificationTime,
    };
  }

  return null;
}
