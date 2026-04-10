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

## 4) No proprietary Google/Firebase dependencies in the APK
- Requirement: F-Droid prohibits proprietary libraries (Firebase, GMS, installreferrer).
- Root cause: `expo-notifications` depends on `com.google.firebase:firebase-messaging` and
  `expo-application` depends on `com.android.installreferrer` as Gradle `implementation` deps.
- Implemented:
  - `patches/expo-notifications+55.0.14.patch` downgrades Firebase from `implementation` → `compileOnly`
    so it is available at compile time but not packaged into the APK.
  - `patches/expo-application+55.0.10.patch` does the same for `installreferrer`.
  - `android/app/build.gradle` adds `if (findProperty('fdroid.build') == 'true') { configurations.configureEach { exclude ... } }`
    for `com.google.firebase`, `com.google.android.gms`, and `com.android.installreferrer` as belt-and-suspenders.
  - `android/app/src/main/AndroidManifest.xml` has Firebase meta-data entries removed.
  - `fdroid:check` validates that patches exist, AndroidManifest is clean, and build.gradle
    contains the exclude rules.

## 5) Repeatable verification command
- Requirement: single command to verify F-Droid profile rules.
- Implemented:
  - `npm run fdroid:check`

## 6) Build command for F-Droid profile
- Requirement: build app using F-Droid profile toggles.
- Implemented:
  - `npm run fdroid:android`

## 7) Documentation
- Requirement: setup and constraints documented for maintainers.
- Implemented:
  - This checklist file.
  - README section with commands.
  - PROJECT_CONTEXT update.

## 8) Third-party license documentation
- Requirement: maintain a reviewable list of third-party dependencies and their licenses.
- Implemented:
  - `THIRD_PARTY_LICENSES.md` generated via `npm run licenses:generate`.
  - `npm run licenses:check` fails if the generated file is out of date.

## 9) GitHub CI pipeline
- Requirement: provide a pipeline that can be run on GitHub to validate readiness.
- Implemented:
  - `.github/workflows/fdroid-readiness.yml`
  - Runs install, `fdroid:check`, `licenses:check`, typecheck, tests, and Android `assembleDebug`.

## Manual follow-up (outside code)
- Keep app license in `fdroid/metadata/io.github.gametrojaner.geburtstage.yml` in sync with `LICENSE` and `package.json` (`GPL-3.0-or-later`).
- Keep contributor patent policy aligned (`PATENTS.md`, `CONTRIBUTING.md`).
- Submit metadata in F-Droid format and follow their review process.
