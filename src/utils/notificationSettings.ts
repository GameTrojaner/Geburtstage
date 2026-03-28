import { AppSettings, NotificationSetting } from '../types';

export function isValidNotificationTime(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
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
