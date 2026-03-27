const baseConfig = require('./app.json');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = () => {
  const config = clone(baseConfig);
  const expo = config.expo || {};
  const isFdroidBuild = process.env.FDROID_BUILD === '1';

  // Disable OTA code updates so shipped code only comes from packaged APK/AAB.
  expo.updates = {
    ...(expo.updates || {}),
    enabled: false,
    checkAutomatically: 'NEVER',
    fallbackToCacheTimeout: 0,
  };

  expo.extra = {
    ...(expo.extra || {}),
    fdroidBuild: isFdroidBuild,
  };

  if (isFdroidBuild) {
    const plugins = expo.plugins || [];
    expo.plugins = plugins.filter((plugin) => {
      const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
      return pluginName !== 'expo-notifications';
    });

    const android = expo.android || {};
    const permissions = android.permissions || [];
    android.permissions = permissions.filter(
      (permission) => permission !== 'android.permission.POST_NOTIFICATIONS'
    );
    expo.android = android;

    expo.autolinking = {
      ...(expo.autolinking || {}),
      exclude: [...new Set([...(expo.autolinking?.exclude || []), 'expo-notifications'])],
    };
  }

  return { expo };
};