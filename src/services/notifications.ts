import Constants, { ExecutionEnvironment } from 'expo-constants';
import { ContactBirthday, NotificationSetting, AppSettings } from '../types';
import { getAllNotificationSettings, getSettings } from './database';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Lazy import – completely skip in Expo Go (notifications removed since SDK 53)
async function getNotificationsModule() {
  if (isExpoGo) return null;
  try {
    const mod = await import('expo-notifications');
    if (typeof mod.requestPermissionsAsync !== 'function') return null;
    return mod;
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return false;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.warn('Notifications not available:', e);
    return false;
  }
}

export async function setupNotificationChannel(): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;
  try {
    await Notifications.setNotificationChannelAsync('birthdays', {
      name: 'Birthdays',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
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

export async function scheduleAllNotifications(
  contacts: ContactBirthday[],
): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
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

  const contactsWithBirthday = contacts.filter(c => c.birthday);

  for (const contact of contactsWithBirthday) {
    if (!contact.birthday) continue;

    const contactNotif = notifMap.get(contact.contactId);
    if (contactNotif && !contactNotif.enabled) continue;

    const offsets = contactNotif?.offsets ?? settings.defaultNotificationOffsets;
    const timeStr = contactNotif?.time ?? settings.defaultNotificationTime;
    const [hours, minutes] = timeStr.split(':').map(Number);

    const nextBday = getNextBirthday(contact.birthday);
    const age = calculateAge(contact.birthday, nextBday);

    for (const offset of offsets) {
      const notifDate = new Date(nextBday);
      notifDate.setDate(notifDate.getDate() - offset);
      notifDate.setHours(hours, minutes, 0, 0);

      if (notifDate <= new Date()) continue;

      let body: string;
      if (offset === 0) {
        body = age
          ? `${contact.name} wird heute ${age} Jahre alt!`
          : `${contact.name} hat heute Geburtstag!`;
      } else {
        body = age
          ? `${contact.name} wird in ${offset} Tagen ${age} Jahre alt!`
          : `${contact.name} hat in ${offset} Tagen Geburtstag!`;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎂 Geburtstag',
          body,
          sound: 'default',
          data: { contactId: contact.contactId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: notifDate,
          channelId: 'birthdays',
        },
      });
    }
  }
}
