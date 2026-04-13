import fs from 'fs';
import path from 'path';

describe('Android boot reschedule config', () => {
  const repoRoot = path.resolve(__dirname, '..');

  it('uses JobService config compatible with system scheduler and without FGS declarations', () => {
    const manifestPath = path.join(repoRoot, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
    const manifest = fs.readFileSync(manifestPath, 'utf8');

    expect(manifest).toContain('android:name=".RescheduleNotificationsJob"');
    expect(manifest).toContain('android:permission="android.permission.BIND_JOB_SERVICE"');
    expect(manifest).toContain('android:exported="true"');

    expect(manifest).not.toContain('android.permission.FOREGROUND_SERVICE_DATA_SYNC');
    expect(manifest).not.toContain('android.permission.FOREGROUND_SERVICE');
    expect(manifest).not.toContain('android:name=".BootTaskService"');
  });

  it('schedules boot reschedule jobs with failure fallback', () => {
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
      'BootReceiver.kt'
    );
    const receiver = fs.readFileSync(receiverPath, 'utf8');

    expect(receiver).toContain('setPersisted(true)');
    expect(receiver).toContain('LocalNotificationsNativeModule.reschedulePersistedNotifications(context)');
    expect(receiver).toContain('val scheduleResult = jobScheduler.schedule(jobInfo)');
    expect(receiver).toContain('JobScheduler.RESULT_SUCCESS');
    expect(receiver).toContain('BootRescheduleState.markPending(context)');
  });
});
