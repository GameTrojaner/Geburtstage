import fs from 'fs';
import path from 'path';

describe('Android local notifications config', () => {
  const repoRoot = path.resolve(__dirname, '..');

  it('registers birthday notification receiver in AndroidManifest', () => {
    const manifestPath = path.join(repoRoot, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
    const manifest = fs.readFileSync(manifestPath, 'utf8');

    expect(manifest).toContain('android:name=".BirthdayNotificationReceiver"');
    expect(manifest).toContain('android.permission.POST_NOTIFICATIONS');
  });

  it('tracks and removes scheduled notification IDs in native module and receiver', () => {
    const modulePath = path.join(
      repoRoot,
      'android',
      'app',
      'src',
      'main',
      'java',
      'io',
      'github',
      'gametrojaner',
      'geburtstage',
      'LocalNotificationsNativeModule.kt'
    );
    const receiverPath = path.join(
      repoRoot,
      'android',
      'app',
      'src',
      'main',
      'java',
      'io',
      'github',
      'gametrojaner',
      'geburtstage',
      'BirthdayNotificationReceiver.kt'
    );

    const moduleContent = fs.readFileSync(modulePath, 'utf8');
    const receiverContent = fs.readFileSync(receiverPath, 'utf8');

    expect(moduleContent).toContain('private const val KEY_IDS = "scheduled_ids"');
    expect(moduleContent).toContain('private const val KEY_SCHEDULES_JSON = "scheduled_payloads_json"');
    expect(moduleContent).toContain('fun removeScheduledId(context: Context, requestCode: Int)');
    expect(moduleContent).toContain('.remove(KEY_IDS)');
    expect(moduleContent).toContain('.remove(KEY_SCHEDULES_JSON)');
    expect(receiverContent).toContain('LocalNotificationsNativeModule.removeScheduledId(context, notificationId)');
  });
});
