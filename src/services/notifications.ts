import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { ContactBirthday, NotificationSetting } from '../types';
import { getAllNotificationSettings, getSettings } from './database';
import { calculateNotificationDate } from '../utils/birthday';
import i18n from '../i18n';

type LocalNotificationsModule = {
  areNotificationsEnabled: () => Promise<boolean>;
  setupBirthdayChannel: () => Promise<void>;
  cancelAllScheduledNotifications: () => Promise<void>;
  scheduleNotificationAt: (
    timestampMs: number,
    title: string,
    body: string,
    contactId: string | null,
  ) => Promise<number>;
};

function getNotificationsModule(): LocalNotificationsModule | null {
  // Native LocalNotifications module exists only on Android in this architecture.
  if (Platform.OS !== 'android') return null;
  return (NativeModules.LocalNotifications as LocalNotificationsModule | undefined) ?? null;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return false;
  try {
    const androidApiLevel = typeof Platform.Version === 'string' ? Number(Platform.Version) : Platform.Version;
    if (Platform.OS === 'android') {
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        return false;
      }
    }

    return Notifications.areNotificationsEnabled();
  } catch (e) {
    console.warn('Notifications not available:', e);
    return false;
  }
}

export async function setupNotificationChannel(): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;
  try {
    await Notifications.setupBirthdayChannel();
  } catch (e) {
    console.warn('Notification channel not available:', e);
  }
}

function getNextBirthday(birthday: { day: number; month: number; year?: number }): Date {
  const now = new Date();
  const thisYear = now.getFullYear();

  let next = new Date(thisYear, birthday.month - 1, birthday.day, 0, 0, 0);
  if (next < now) {
    next = new Date(thisYear + 1, birthday.month - 1, birthday.day, 0, 0, 0);
  }
  return next;
}

function calculateAge(birthday: { day: number; month: number; year?: number }, onDate: Date): number | undefined {
  if (!birthday.year) return undefined;
  return onDate.getFullYear() - birthday.year;
}

export function getNotificationLeadDays(nextBday: Date, notifDate: Date): number {
  const birthdayDate = new Date(nextBday.getFullYear(), nextBday.getMonth(), nextBday.getDate());
  const notificationDate = new Date(notifDate.getFullYear(), notifDate.getMonth(), notifDate.getDate());
  const diffMs = birthdayDate.getTime() - notificationDate.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export async function scheduleAllNotifications(
  contacts: ContactBirthday[],
  maxDaysAhead: number = 180,
): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotifications();
  } catch (e) {
    console.warn('Notifications not available:', e);
    return;
  }

  const settings = await getSettings();
  if (!settings.notificationsEnabled) return;

  const allNotifSettings = await getAllNotificationSettings();
  const notifMap = new Map<string, NotificationSetting>();
  for (const ns of allNotifSettings) {
    notifMap.set(ns.contactId, ns);
  }

  // Filter contacts: only include those with birthdays, enabled notifications, and within the time window
  const now = new Date();
  const maxDate = new Date(now.getTime() + maxDaysAhead * 24 * 60 * 60 * 1000);

  const contactsToNotify = contacts.filter(contact => {
    if (!contact.birthday) return false;

    const contactNotif = notifMap.get(contact.contactId);
    if (contactNotif && !contactNotif.enabled) return false;

    // Check if next birthday is within the time window
    const nextBday = getNextBirthday(contact.birthday);
    return nextBday <= maxDate;
  });

  let scheduledCount = 0;
  const maxAlarms = 450; // Leave buffer below Android's 500 limit

  for (const contact of contactsToNotify) {
    if (!contact.birthday) continue;

    const contactNotif = notifMap.get(contact.contactId);
    const offsets = contactNotif?.offsets ?? settings.defaultNotificationOffsets;
    const timeStr = contactNotif?.time ?? settings.defaultNotificationTime;
    const [hours, minutes] = timeStr.split(':').map(Number);

    const nextBday = getNextBirthday(contact.birthday);
    const age = calculateAge(contact.birthday, nextBday);

    for (const offset of offsets) {
      // Stop scheduling if approaching limit
      if (scheduledCount >= maxAlarms) {
        console.warn(
          `Notification scheduling limit approaching: ${scheduledCount}/${maxAlarms} alarms scheduled. Skipped notifications for remaining contacts.`
        );
        return;
      }

      const notifDate = calculateNotificationDate(nextBday, offset, hours, minutes);

      if (notifDate <= now) continue;

      const daysUntil = getNotificationLeadDays(nextBday, notifDate);

      let body: string;
      if (offset === 0) {
        body = age
          ? i18n.t('notification.bodyTodayAge', { name: contact.name, age })
          : i18n.t('notification.bodyToday', { name: contact.name });
      } else {
        body = age
          ? i18n.t('notification.bodyUpcomingAge', { name: contact.name, days: daysUntil, age })
          : i18n.t('notification.bodyUpcoming', { name: contact.name, days: daysUntil });
      }

      try {
        await Notifications.scheduleNotificationAt(
          notifDate.getTime(),
          i18n.t('notification.title'),
          body,
          contact.contactId,
        );
        scheduledCount++;
      } catch (e) {
        console.error(`Failed to schedule notification for ${contact.name}:`, e);
      }
    }
  }

  console.log(`Successfully scheduled ${scheduledCount} notifications.`);
}
