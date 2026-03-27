const path = require('path');
const fs = require('fs');

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

console.log('[fdroid-check] All checks passed.');
