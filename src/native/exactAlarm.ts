import { NativeModules, Platform } from 'react-native';

const { ExactAlarm } = NativeModules;

/**
 * Returns true when exact alarms can be scheduled:
 * - Always true on Android < 12 (no restriction)
 * - Always true on Android 13+ (USE_EXACT_ALARM auto-granted for reminder apps)
 * - On Android 12 (API 31–32): true only after the user grants
 *   "Alarms & reminders" in Settings > Apps > Special app access
 * - Always true on non-Android platforms (iOS handles permission differently)
 */
export async function canScheduleExactAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android' || !ExactAlarm) return true;
  try {
    return await ExactAlarm.canScheduleExactAlarms();
  } catch {
    return true; // fail open: don't block UI unnecessarily
  }
}

/**
 * Opens the "Alarms & reminders" special-access settings screen.
 * Only meaningful on Android 12 (API 31–32).
 */
export async function openExactAlarmSettings(): Promise<void> {
  if (Platform.OS !== 'android' || !ExactAlarm) return;
  try {
    await ExactAlarm.openExactAlarmSettings();
  } catch {
    // Ignore if the intent can't be launched (very old AOSP forks)
  }
}
