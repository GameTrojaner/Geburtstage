import { checkContactsPermission, getAllContacts } from '../services/contacts';
import { scheduleAllNotifications } from '../services/notifications';

/**
 * HeadlessJS task registered as "RescheduleNotifications".
 * Triggered by BootTaskService on device boot to re-create all AlarmManager
 * entries (which Android cancels on every reboot).
 *
 * Runs without a UI – must not import any React hooks or components.
 */
export async function bootTask(): Promise<void> {
  const hasPermission = await checkContactsPermission();
  if (!hasPermission) return;

  const contacts = await getAllContacts();
  await scheduleAllNotifications(contacts);
}
