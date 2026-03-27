/**
 * Web stub for notifications service.
 * Push notifications are not available on web.
 */
import { ContactBirthday } from '../types';

export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function setupNotificationChannel(): Promise<void> {
  // No-op on web
}

export async function scheduleAllNotifications(
  _contacts: ContactBirthday[],
): Promise<void> {
  // No-op on web
}
