import { NativeModules, Platform } from 'react-native';

type BootRescheduleModule = {
  consumePendingReschedule?: () => Promise<boolean>;
};

export async function consumePendingBootReschedule(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  const mod = NativeModules.BootReschedule as BootRescheduleModule | undefined;
  if (!mod?.consumePendingReschedule) return false;

  try {
    return Boolean(await mod.consumePendingReschedule());
  } catch {
    return false;
  }
}