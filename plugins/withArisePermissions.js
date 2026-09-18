const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withArisePermissions(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults.manifest;

    // Ensure permissions array exists
    if (!androidManifest['uses-permission']) {
      androidManifest['uses-permission'] = [];
    }

    const permissionsToAdd = [
      'android.permission.PACKAGE_USAGE_STATS',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.USE_EXACT_ALARM',
      'android.permission.WAKE_LOCK',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.CAMERA',
      'android.permission.VIBRATE',
      'android.permission.QUERY_ALL_PACKAGES',
      'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
    ];

    permissionsToAdd.forEach((perm) => {
      if (!androidManifest['uses-permission'].some((p) => p.$['android:name'] === perm)) {
        androidManifest['uses-permission'].push({
          $: { 'android:name': perm },
        });
      }
    });

    // Add <queries> block for Android 11+ Package Visibility
    if (!androidManifest.queries) {
      androidManifest.queries = [];
    }

    const launcherQuery = {
      intent: [
        {
          action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
          category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
        },
      ],
    };

    androidManifest.queries.push(launcherQuery);

    return config;
  });
};
