const path = require('path');

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
if (hasNotificationsPlugin) {
  fail('expo-notifications plugin must be removed in FDROID_BUILD=1 config.');
}
pass('expo-notifications plugin is removed for FDROID_BUILD=1.');

const androidPermissions = expo.android?.permissions || [];
if (androidPermissions.includes('android.permission.POST_NOTIFICATIONS')) {
  fail('POST_NOTIFICATIONS permission must be removed in FDROID_BUILD=1 config.');
}
pass('POST_NOTIFICATIONS permission is removed for FDROID_BUILD=1.');

const autolinkingExclude = expo.autolinking?.exclude || [];
if (!autolinkingExclude.includes('expo-notifications')) {
  fail('expo-notifications must be excluded from autolinking in FDROID_BUILD=1 config.');
}
pass('expo-notifications is excluded from autolinking for FDROID_BUILD=1.');

if (!expo.extra || expo.extra.fdroidBuild !== true) {
  fail('expo.extra.fdroidBuild must be true when FDROID_BUILD=1.');
}
pass('fdroid build flag is exported to runtime config.');

console.log('[fdroid-check] All checks passed.');
