import { checkContactsPermission } from '../services/contacts';
import { consumePendingBootReschedule } from '../native/bootReschedule';

type RescheduleActions = {
  loadContacts: () => Promise<void>;
  rescheduleNotifications: () => Promise<void>;
};

export async function runPendingBootReschedule(actions: RescheduleActions): Promise<boolean> {
  // Check permission first so the pending flag is only consumed if we can actually act on it.
  // If permission is missing, the flag stays set and the reschedule is retried on the next app start.
  const hasContactsPermission = await checkContactsPermission();
  if (!hasContactsPermission) return false;

  const hasPendingReschedule = await consumePendingBootReschedule();
  if (!hasPendingReschedule) return false;

  await actions.loadContacts();
  await actions.rescheduleNotifications();
  return true;
}