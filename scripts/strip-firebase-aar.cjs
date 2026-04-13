const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

const TARGET_AAR = path.join(
  ROOT,
  'node_modules',
  'expo-notifications',
  'local-maven-repo',
  'host',
  'exp',
  'exponent',
  'expo.modules.notifications',
  '55.0.14',
  'expo.modules.notifications-55.0.14.aar'
);

const FIREBASE_CLASS_FILES = [
  'expo/modules/notifications/service/ExpoFirebaseMessagingService.class',
  'expo/modules/notifications/service/delegates/FirebaseMessagingDelegate.class',
  'expo/modules/notifications/service/delegates/FirebaseMessagingDelegate$Companion.class',
  'expo/modules/notifications/service/interfaces/FirebaseMessagingDelegate.class',
  'expo/modules/notifications/tokens/interfaces/FirebaseTokenListener.class',
  'expo/modules/notifications/notifications/model/triggers/FirebaseNotificationTrigger.class',
  'expo/modules/notifications/notifications/model/triggers/FirebaseNotificationTrigger$Companion.class',
  'expo/modules/notifications/notifications/model/triggers/FirebaseNotificationTrigger$Companion$CREATOR$1.class',
];

function log(message) {
  console.log(`[strip-firebase-aar] ${message}`);
}

function fail(message) {
  console.error(`[strip-firebase-aar] FAIL: ${message}`);
  process.exit(1);
}

function runJar(args, cwd) {
  const result = spawnSync('jar', args, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.error) {
    if (result.error.code === 'ENOENT') {
      return { missing: true, stdout: '', stderr: '' };
    }
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `jar exited with code ${result.status}`);
  }

  return { missing: false, stdout: result.stdout, stderr: result.stderr };
}

function removeFirebaseServiceFromManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    fail(`Missing AndroidManifest.xml in extracted AAR: ${manifestPath}`);
  }

  const content = fs.readFileSync(manifestPath, 'utf8');

  const serviceRegex =
    /\s*<service[\s\S]*?android:name="expo\.modules\.notifications\.service\.ExpoFirebaseMessagingService"[\s\S]*?<\/service>\s*/m;

  const cleaned = content
    .replace(serviceRegex, '\n')
    .replace(/\s*<action android:name="com\.google\.firebase\.MESSAGING_EVENT"\s*\/>\s*/g, '\n');

  if (cleaned !== content) {
    fs.writeFileSync(manifestPath, cleaned, 'utf8');
    return true;
  }

  return false;
}

function removeFirebaseClasses(classesRoot) {
  let removedCount = 0;

  for (const classFile of FIREBASE_CLASS_FILES) {
    const fullPath = path.join(classesRoot, classFile);
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { force: true });
      removedCount += 1;
    }
  }

  return removedCount;
}

function main() {
  if (!fs.existsSync(TARGET_AAR)) {
    log('expo-notifications AAR not found, skipping strip step.');
    return;
  }

  const probe = runJar(['--help'], ROOT);
  if (probe.missing) {
    log("'jar' command not found in PATH, skipping AAR strip step.");
    return;
  }

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'strip-firebase-aar-'));
  const extractedAarDir = path.join(tmpRoot, 'aar');
  const classesDir = path.join(tmpRoot, 'classes');
  const repackedAar = path.join(tmpRoot, 'expo.modules.notifications-55.0.14.aar');

  fs.mkdirSync(extractedAarDir, { recursive: true });
  fs.mkdirSync(classesDir, { recursive: true });

  try {
    runJar(['xf', TARGET_AAR], extractedAarDir);

    const classesJarPath = path.join(extractedAarDir, 'classes.jar');
    if (!fs.existsSync(classesJarPath)) {
      fail(`Missing classes.jar in AAR: ${TARGET_AAR}`);
    }

    runJar(['xf', classesJarPath], classesDir);

    const removedClassCount = removeFirebaseClasses(classesDir);
    const manifestChanged = removeFirebaseServiceFromManifest(
      path.join(extractedAarDir, 'AndroidManifest.xml')
    );

    fs.rmSync(classesJarPath, { force: true });
    runJar(['cf', classesJarPath, '-C', classesDir, '.'], extractedAarDir);

    fs.rmSync(classesDir, { recursive: true, force: true });
    runJar(['cf', repackedAar, '-C', extractedAarDir, '.'], tmpRoot);

    fs.copyFileSync(repackedAar, TARGET_AAR);

    log(
      `AAR sanitized (removed ${removedClassCount} Firebase class file(s), manifestChanged=${manifestChanged}).`
    );
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

main();
