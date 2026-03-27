# F-Droid Readiness Checklist

Status: implemented in repository

## 1) No remote code updates (OTA)
- Requirement: disable Expo Updates so runtime code only comes from packaged APK/AAB.
- Implemented:
  - `app.config.js` sets `expo.updates.enabled=false`.
  - `fdroid:check` validates this.

## 2) Remove notification-specific Android permission/plugin for F-Droid build
- Requirement: keep notifications F-Droid-compatible and local-only (no remote push backend).
- Implemented:
  - Keeps `expo-notifications` plugin enabled.
  - Keeps `android.permission.POST_NOTIFICATIONS` for Android 13+ local notifications.
  - Declares `expo.extra.notificationsMode='local-only'`.
  - `fdroid:check` validates that notifications code does not use Expo push token APIs.

## 3) Runtime behavior must match F-Droid profile
- Requirement: app should use local scheduled notifications only.
- Implemented:
  - `src/services/notifications.ts` schedules local date-based notifications and does not use push tokens.

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

## 7) Third-party license documentation
- Requirement: maintain a reviewable list of third-party dependencies and their licenses.
- Implemented:
  - `THIRD_PARTY_LICENSES.md` generated via `npm run licenses:generate`.
  - `npm run licenses:check` fails if the generated file is out of date.

## 8) GitHub CI pipeline
- Requirement: provide a pipeline that can be run on GitHub to validate readiness.
- Implemented:
  - `.github/workflows/fdroid-readiness.yml`
  - Runs install, `fdroid:check`, `licenses:check`, typecheck, tests, and Android `assembleDebug`.

## Manual follow-up (outside code)
- Set app license in `fdroid/metadata/com.anonymous.Geburtstage.yml` (`License: TODO-SET-SPDX-LICENSE`).
- Submit metadata in F-Droid format and follow their review process.
