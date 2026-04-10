import { checkContactsPermission } from '../services/contacts';
import { consumePendingBootReschedule } from '../native/bootReschedule';

type RescheduleActions = {
  loadContacts: () => Promise<void>;
  rescheduleNotifications: () => Promise<void>;
};

export async function runPendingBootReschedule(actions: RescheduleActions): Promise<boolean> {
  const hasPendingReschedule = await consumePendingBootReschedule();
  if (!hasPendingReschedule) return false;

  const hasContactsPermission = await checkContactsPermission();
  if (!hasContactsPermission) return false;

  await actions.loadContacts();
  await actions.rescheduleNotifications();
  return true;
}