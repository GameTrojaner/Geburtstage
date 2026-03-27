# F-Droid Readiness Checklist

Status: implemented in repository

## 1) No remote code updates (OTA)
- Requirement: disable Expo Updates so runtime code only comes from packaged APK/AAB.
- Implemented:
  - `app.config.js` sets `expo.updates.enabled=false`.
  - `fdroid:check` validates this.

## 2) Remove notification-specific Android permission/plugin for F-Droid build
- Requirement: avoid shipping unnecessary notification-specific integration in F-Droid profile.
- Implemented for `FDROID_BUILD=1`:
  - Removes `expo-notifications` plugin from Expo config.
  - Removes `android.permission.POST_NOTIFICATIONS`.
  - Excludes `expo-notifications` from Expo autolinking.
  - Exposes `expo.extra.fdroidBuild=true` to runtime.
  - `fdroid:check` validates all three points.

## 3) Runtime behavior must match F-Droid profile
- Requirement: app should not attempt notifications path in F-Droid profile.
- Implemented:
  - `src/services/notifications.ts` disables notifications module when `extra.fdroidBuild` is true.

## 4) Repeatable verification command
- Requirement: single command to verify F-Droid profile rules.
- Implemented:
  - `npm run fdroid:check`

## 5) Build command for F-Droid profile
- Requirement: build app using F-Droid profile toggles.
- Implemented:
  - `npm run fdroid:android`

## 6) Documentation
- Requirement: setup and constraints documented for maintainers.
- Implemented:
  - This checklist file.
  - README section with commands.
  - PROJECT_CONTEXT update.

## Manual follow-up (outside code)
- Confirm chosen app/project license is F-Droid-compatible.
- Submit metadata in F-Droid format and follow their review process.
