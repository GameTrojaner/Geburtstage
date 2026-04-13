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

if (expo.updates?.checkAutomatically !== 'NEVER') {
  fail("expo.updates.checkAutomatically must be 'NEVER'.");
}
if (expo.updates?.fallbackToCacheTimeout !== 0) {
  fail('expo.updates.fallbackToCacheTimeout must be 0.');
}
pass('OTA update policy is locked down (NEVER + fallbackToCacheTimeout=0).');

const plugins = expo.plugins || [];
const hasContactsPlugin = plugins.some((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) === 'expo-contacts');
if (!hasContactsPlugin) {
  fail('expo-contacts plugin must remain enabled.');
}
pass('expo-contacts plugin is enabled.');

const androidPermissions = expo.android?.permissions || [];
if (!androidPermissions.includes('android.permission.POST_NOTIFICATIONS')) {
  fail('POST_NOTIFICATIONS permission must be present for Android 13+ local notifications.');
}
pass('POST_NOTIFICATIONS permission is present for local notifications.');

const notificationsPath = path.resolve(__dirname, '..', 'src', 'services', 'notifications.ts');
const notificationsContent = fs.readFileSync(notificationsPath, 'utf8');
if (/expo-notifications|getExpoPushTokenAsync|ExpoPushToken|push token/i.test(notificationsContent)) {
  fail('notifications.ts must stay local-only and must not depend on expo-notifications or Expo push tokens.');
}
pass('notifications.ts uses local-only scheduling (no expo-notifications / push token usage).');

if (!expo.extra || expo.extra.notificationsMode !== 'local-only') {
  fail('expo.extra.notificationsMode must be set to local-only.');
}
pass('notifications mode is declared as local-only.');

// package.json must not contain firebase, GMS, or expo-notifications.
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const dependencySections = [
  packageJson.dependencies,
  packageJson.devDependencies,
  packageJson.optionalDependencies,
  packageJson.peerDependencies,
];

if (Array.isArray(packageJson.bundledDependencies)) {
  dependencySections.push(Object.fromEntries(packageJson.bundledDependencies.map((name) => [name, '*'])));
}

if (Array.isArray(packageJson.bundleDependencies)) {
  dependencySections.push(Object.fromEntries(packageJson.bundleDependencies.map((name) => [name, '*'])));
}

const allDeps = Object.keys(Object.assign({}, ...dependencySections.filter(Boolean)));
const forbiddenPkgs = allDeps.filter((dep) =>
  /firebase|@react-native-firebase|google-services|play-services|expo-notifications/i.test(dep)
);
if (forbiddenPkgs.length > 0) {
  fail(`Forbidden dependencies found in package.json: ${forbiddenPkgs.join(', ')}`);
}
pass('No Firebase/GMS/expo-notifications packages in package.json.');

// postinstall must continue to run patch-package for expo patches.
const postinstallScript = packageJson.scripts?.postinstall || '';
if (!/patch-package/.test(postinstallScript)) {
  fail("package.json scripts.postinstall must execute patch-package.");
}
pass('postinstall runs patch-package.');

// Required patch: expo-application must keep installreferrer as compileOnly.
const patchPath = path.join(ROOT, 'patches/expo-application+55.0.10.patch');
if (!fs.existsSync(patchPath)) {
  fail('Missing required F-Droid patch: patches/expo-application+55.0.10.patch');
}
const patchContent = fs.readFileSync(patchPath, 'utf8');
if (!/^-\s*implementation\s+'com\.android\.installreferrer:installreferrer:[^']+'/m.test(patchContent)) {
  fail('expo-application patch must remove implementation installreferrer dependency.');
}
if (!/^\+\s*compileOnly\s+'com\.android\.installreferrer:installreferrer:[^']+'/m.test(patchContent)) {
  fail('expo-application patch must add compileOnly installreferrer dependency.');
}
pass('expo-application patch enforces compileOnly installreferrer.');

// Installed expo-application module must reflect compileOnly.
const expoApplicationGradlePath = path.join(ROOT, 'node_modules/expo-application/android/build.gradle');
if (!fs.existsSync(expoApplicationGradlePath)) {
  fail('Missing node_modules/expo-application/android/build.gradle. Run npm ci --legacy-peer-deps first.');
}
const expoApplicationGradle = fs.readFileSync(expoApplicationGradlePath, 'utf8');
if (!/\bcompileOnly\s+['"]com\.android\.installreferrer:installreferrer:[^'"]+['"]/.test(expoApplicationGradle)) {
  fail('expo-application build.gradle must declare installreferrer as compileOnly.');
}
if (/\bimplementation\s+['"]com\.android\.installreferrer:installreferrer:[^'"]+['"]/.test(expoApplicationGradle)) {
  fail('expo-application build.gradle must not declare installreferrer as implementation.');
}
pass('Installed expo-application Gradle file uses compileOnly for installreferrer.');

// Installed expo-application local Maven metadata must not reintroduce installreferrer.
const localMavenMetadataChecks = [
  {
    file: 'node_modules/expo-application/local-maven-repo/host/exp/exponent/expo.modules.application/55.0.10/expo.modules.application-55.0.10.pom',
    forbidden: [/com\.android\.installreferrer/, /installreferrer/],
  },
  {
    file: 'node_modules/expo-application/local-maven-repo/host/exp/exponent/expo.modules.application/55.0.10/expo.modules.application-55.0.10.module',
    forbidden: [/"group"\s*:\s*"com\.android\.installreferrer"/, /"module"\s*:\s*"installreferrer"/],
  },
];

for (const { file, forbidden } of localMavenMetadataChecks) {
  const metadataPath = path.join(ROOT, file);
  if (!fs.existsSync(metadataPath)) {
    fail(`Missing ${file}. Run npm ci --legacy-peer-deps first.`);
  }

  const content = fs.readFileSync(metadataPath, 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(content)) {
      fail(`${file} must not declare proprietary runtime dependency '${pattern.source}'.`);
    }
  }
}
pass('Installed expo-application local-Maven metadata is free of installreferrer runtime deps.');

// AndroidManifest.xml must not reference Firebase meta-data keys.
const manifestPath = path.join(ROOT, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
const manifestContent = fs.readFileSync(manifestPath, 'utf8');
if (/com\.google\.firebase/.test(manifestContent)) {
  fail('AndroidManifest.xml contains Firebase references. Remove them for F-Droid compliance.');
}
pass('AndroidManifest.xml contains no Firebase references.');

// Native local notifications receiver must be registered.
if (!/BirthdayNotificationReceiver/.test(manifestContent)) {
  fail('AndroidManifest.xml must register BirthdayNotificationReceiver for native local notifications.');
}
pass('AndroidManifest.xml registers BirthdayNotificationReceiver.');

// android/app/build.gradle must exclude Firebase/GMS groups behind an fdroid.build guard.
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

// Android Gradle files must not apply Google services/Firebase proprietary Gradle plugins.
const gradleFilesToScan = ['android/build.gradle', 'android/app/build.gradle'];
const forbiddenGradlePluginPatterns = [
  /com\.google\.gms\.google-services/,
  /com\.google\.firebase\.crashlytics/,
  /com\.google\.firebase\.perf/,
];

for (const relPath of gradleFilesToScan) {
  const filePath = path.join(ROOT, relPath);
  const content = fs.readFileSync(filePath, 'utf8');

  for (const pattern of forbiddenGradlePluginPatterns) {
    if (pattern.test(content)) {
      fail(`${relPath} references forbidden proprietary Gradle plugin '${pattern.source}'.`);
    }
  }
}
pass('Android Gradle files contain no Google services/Firebase proprietary plugin references.');

console.log('[fdroid-check] All checks passed.');
