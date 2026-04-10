const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');

function loadFdroidConfig() {
  process.env.FDROID_BUILD = '1';
  const configPath = path.resolve(__dirname, '..', 'app.config.js');
  delete require.cache[configPath];
  const factory = require(configPath);
  const cfg = typeof factory === 'function' ? factory({}) : factory;
  return cfg.expo || {};
}

function getPluginName(plugin) {
  return Array.isArray(plugin) ? plugin[0] : plugin;
}

function fail(message) {
  console.error(`[fdroid-check] FAIL: ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`[fdroid-check] PASS: ${message}`);
}

const expo = loadFdroidConfig();

if (expo.updates?.enabled !== false) {
  fail('expo.updates.enabled must be false.');
}
pass('OTA updates are disabled.');

const plugins = expo.plugins || [];
const hasNotificationsPlugin = plugins.some((plugin) => getPluginName(plugin) === 'expo-notifications');
if (!hasNotificationsPlugin) {
  fail('expo-notifications plugin must remain enabled for local notifications.');
}
pass('expo-notifications plugin is enabled.');

const androidPermissions = expo.android?.permissions || [];
if (!androidPermissions.includes('android.permission.POST_NOTIFICATIONS')) {
  fail('POST_NOTIFICATIONS permission must be present for Android 13+ local notifications.');
}
pass('POST_NOTIFICATIONS permission is present for local notifications.');

const notificationsPath = path.resolve(__dirname, '..', 'src', 'services', 'notifications.ts');
const notificationsContent = fs.readFileSync(notificationsPath, 'utf8');
if (/getExpoPushTokenAsync|ExpoPushToken|push token/i.test(notificationsContent)) {
  fail('notifications.ts must stay local-only and must not use Expo push tokens.');
}
pass('notifications.ts uses local-only scheduling (no Expo push token usage).');

if (!expo.extra || expo.extra.notificationsMode !== 'local-only') {
  fail('expo.extra.notificationsMode must be set to local-only.');
}
pass('notifications mode is declared as local-only.');

// 6. package.json must not contain firebase or GMS packages
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const allDeps = Object.keys({
  ...(packageJson.dependencies || {}),
  ...(packageJson.devDependencies || {}),
});
const forbiddenPkgs = allDeps.filter((dep) =>
  /firebase|@react-native-firebase|google-services|play-services/i.test(dep)
);
if (forbiddenPkgs.length > 0) {
  fail(`Forbidden proprietary packages found in package.json: ${forbiddenPkgs.join(', ')}`);
}
pass('No Firebase or GMS packages in package.json.');

// 7. Patches must exist to exclude Firebase/GMS/installreferrer from the APK
const requiredPatches = [
  {
    file: 'patches/expo-notifications+55.0.14.patch',
    artifact: 'com.google.firebase:firebase-messaging',
  },
  {
    file: 'patches/expo-application+55.0.10.patch',
    artifact: 'com.android.installreferrer:installreferrer',
  },
];
for (const { file: patchFile, artifact } of requiredPatches) {
  const patchPath = path.join(ROOT, patchFile);
  if (!fs.existsSync(patchPath)) {
    fail(
      `Missing required F-Droid patch: ${patchFile}. Restore this file from git (or ensure it is committed) and rerun 'npm ci' so postinstall can apply patches.`
    );
  }

  const patchContent = fs.readFileSync(patchPath, 'utf8');

  const escapedArtifact = artifact.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const removedImplementationRegex = new RegExp(
    `^-\\s*implementation\\s+'${escapedArtifact}:[^']+'`,
    'm'
  );
  const addedCompileOnlyRegex = new RegExp(
    `^\\+\\s*compileOnly\\s+'${escapedArtifact}:[^']+'`,
    'm'
  );

  if (!removedImplementationRegex.test(patchContent) || !addedCompileOnlyRegex.test(patchContent)) {
    fail(
      `Patch ${patchFile} must replace 'implementation' with 'compileOnly' for ${artifact} so the proprietary artifact is not packaged.`
    );
  }
}
pass('Patches for expo-notifications and expo-application exclude proprietary deps (compileOnly).');

// 8. AndroidManifest.xml must not reference Firebase meta-data keys
const manifestPath = path.join(ROOT, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
const manifestContent = fs.readFileSync(manifestPath, 'utf8');
if (/com\.google\.firebase/.test(manifestContent)) {
  fail('AndroidManifest.xml contains Firebase meta-data keys. Remove them for F-Droid compliance.');
}
pass('AndroidManifest.xml contains no Firebase meta-data entries.');

// 9. android/app/build.gradle must exclude Firebase/GMS groups behind an fdroid.build guard
const appBuildGradlePath = path.join(ROOT, 'android', 'app', 'build.gradle');
const appBuildGradleContent = fs.readFileSync(appBuildGradlePath, 'utf8');
const fdroidGuardRegex =
  /if\s*\(\s*findProperty\('fdroid\.build'\)\s*==\s*'true'\s*\)\s*\{[\s\S]*?configurations\.(?:all|configureEach)\s*\{[\s\S]*?exclude group: 'com\.google\.firebase'[\s\S]*?exclude group: 'com\.google\.android\.gms'[\s\S]*?exclude group: 'com\.android\.installreferrer'[\s\S]*?\}[\s\S]*?\}/m;
if (!fdroidGuardRegex.test(appBuildGradleContent)) {
  fail(
    "android/app/build.gradle Firebase/GMS exclusions must be inside if (findProperty('fdroid.build') == 'true') { ... } and include excludes for 'com.google.firebase', 'com.google.android.gms', and 'com.android.installreferrer'."
  );
}
pass('android/app/build.gradle excludes Firebase, GMS, and installreferrer (conditional on fdroid.build=true).');

console.log('[fdroid-check] All checks passed.');
