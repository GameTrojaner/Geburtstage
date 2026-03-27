const baseConfig = require('./app.json');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = () => {
  const config = clone(baseConfig);
  const expo = config.expo || {};

  // Disable OTA code updates so shipped code only comes from packaged APK/AAB.
  expo.updates = {
    ...(expo.updates || {}),
    enabled: false,
    checkAutomatically: 'NEVER',
    fallbackToCacheTimeout: 0,
  };

  expo.extra = {
    ...(expo.extra || {}),
    fdroidBuild: process.env.FDROID_BUILD === '1',
    notificationsMode: 'local-only',
  };

  return { expo };
};