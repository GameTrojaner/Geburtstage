# Geburtstage – Birthday Reminder App

React Native App (Expo SDK 55) zum Anzeigen und Verwalten von Geburtstagen aus den Telefonkontakten.

## Lizenz

- Projektlizenz: `GPL-3.0-or-later` (siehe `LICENSE`)
- Contributor-Patentregel: `PATENTS.md`
- Contributor-Richtlinien: `CONTRIBUTING.md`

## Voraussetzungen

- **Node.js** >= 18 (empfohlen: 20 LTS)
- **npm** (kommt mit Node.js)
- **Android Studio** (für Android-Emulator / Dev Build)
- **Expo Go** App auf dem Handy (für Schnelltests) — APK von https://expo.dev/go (Play Store Version ggf. veraltet)

## Installation

```bash
git clone <repo-url>
cd Geburtstage
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` ist nötig wegen Abhängigkeitskonflikten zwischen React 19 und einigen Paketen.

### Entwicklungsumgebung automatisch einrichten (Windows)

```powershell
powershell -ExecutionPolicy Bypass -File setup-dev.ps1
```

### Entwicklungsumgebung automatisch einrichten (Linux/macOS)

```bash
chmod +x setup-dev.sh
./setup-dev.sh
```

Beide Scripts installieren Node.js, Git, optional Android Studio, setzen Umgebungsvariablen und führen `npm install` + Verifikation aus.

## Wichtige Befehle

| Befehl | Beschreibung |
|---|---|
| `npx expo start` | Dev-Server starten (QR-Code für Expo Go) |
| `npx expo start --web` | App im Browser öffnen |
| `npx expo start --web --clear` | Browser mit geleertem Metro-Cache |
| `npx expo start --tunnel` | Dev-Server über Tunnel (bei WLAN-Problemen) |
| `npx expo start --android` | App im Android-Emulator starten |
| `npx expo run:android` | **Development Build** auf Gerät/Emulator (voller native Zugriff) |
| `npm test` | Alle Unit-Tests ausführen |
| `npm run test:all` | TypeScript-Check + Unit-Tests |
| `npm run test:ci` | Jest im CI-Modus mit Coverage |
| `npm run test:all:ci` | TypeScript-Check + CI-Tests |
| `npm run test:watch` | Tests im Watch-Modus |
| `npm run test:coverage` | Tests mit Coverage-Report |
| `npm run fdroid:check` | Prueft F-Droid Build-Constraints (`FDROID_BUILD=1`) |
| `npm run fdroid:metadata:drift` | Prueft F-Droid Metadaten-Invarianten; optional mit Referenzvergleich via `FDROID_METADATA_REF` oder `-- --against <path|url>` |
| `npm run fdroid:android` | Android Build mit F-Droid Profil (`FDROID_BUILD=1`) |
| `npm run licenses:generate` | Generiert `THIRD_PARTY_LICENSES.md` aus installierten Paketen |
| `npm run licenses:check` | Prueft, dass `THIRD_PARTY_LICENSES.md` aktuell ist |
| `npx tsc --noEmit` | TypeScript-Check ohne Build |

## App testen

### 1. Im Browser (PC)

```bash
npx expo start --web
```

- Öffnet sich unter `http://localhost:8081`
- Gut für: Navigation, Theme-Wechsel, Sprache, Kalender-UI, Settings testen
- Web nutzt `localStorage` statt SQLite (automatisch via `.web.ts` Stubs)
- **Geht NICHT im Browser:** Echte Kontakte, Push-Notifications, Widgets

> **TLS-Fehler?** Falls `unable to get local issuer certificate` kommt (Firmennetz/VPN):
> ```powershell
> $env:NODE_TLS_REJECT_UNAUTHORIZED="0"; npx expo start --web
> ```

### 2. Auf dem Android-Handy mit Expo Go (Schnelltest)

1. **Expo Go** installieren — APK von https://expo.dev/go (Play Store ist oft veraltet für SDK 55)
2. Handy und PC müssen im **selben WLAN** sein
3. Dev-Server starten:
   ```bash
   npx expo start
   ```
4. QR-Code im Terminal mit Expo Go scannen
5. App lädt und startet auf dem Handy

**Funktioniert mit Expo Go:**
- Kontakte lesen ✅
- Navigation, UI, Themes ✅
- Sprache wechseln ✅

**Geht NICHT mit Expo Go (braucht Development Build):**
- Geburtstage in Kontakte schreiben ❌
- Push-Notifications ❌ (seit SDK 53 aus Expo Go entfernt)
- Homescreen-Widgets ❌

> **Verbindungsprobleme?** Versuch `npx expo start --tunnel` (routet über ngrok statt lokales WLAN).

### 3. Android-Emulator (PC)

1. **Android Studio** installieren
2. Im Android Studio: SDK Manager → Android SDK + Build-Tools installieren
3. AVD Manager → Neues virtuelles Gerät erstellen (z.B. Pixel 7, API 34)
4. Emulator starten, dann:
   ```bash
   npx expo start --android
   ```
   oder für vollen nativen Zugriff:
   ```bash
   npx expo run:android
   ```

### 4. Development Build auf echtem Gerät (voller Funktionsumfang)

Damit **alle Features** funktionieren (Kontakte schreiben, Notifications, Widgets):

1. **Android Studio** installieren + Android SDK
2. Umgebungsvariable setzen:
   - `ANDROID_HOME` = `C:\Users\<Name>\AppData\Local\Android\Sdk`
   - `PATH` um `%ANDROID_HOME%\platform-tools` erweitern
3. **USB-Debugging** auf dem Handy aktivieren:
   - Einstellungen → Über das Telefon → 7x auf "Build-Nummer" tippen
   - Entwickleroptionen → USB-Debugging aktivieren
4. Handy per USB verbinden, Verbindung am Handy bestätigen
5. Build starten:
   ```bash
   npx expo run:android
   ```
   > Erster Build dauert mehrere Minuten. Danach wird die App direkt installiert.

### 5. Unit Tests

```bash
# Alle Tests einmalig
npm test

# Typecheck + Tests (empfohlen lokal)
npm run test:all

# CI-Lauf (inkl. Coverage)
npm run test:all:ci

# Watch-Modus (bei Dateiänderungen)
npm run test:watch

# Mit Coverage-Report
npm run test:coverage
```

Aktuell: **150 Tests** in 18 Suites.

## Notification-Offset-Kodierung

- **Positive Werte**: Exakte Anzahl Tage vor dem Geburtstag (z.B. `1` = 1 Tag, `7` = 1 Woche, `30` = genau 30 Tage).
- **Negative Werte**: Kalenderbasierte Monate (z.B. `-1` = 1 Monat, `-2` = 2 Monate). Der 28. April minus 1 Monat ergibt immer den 28. März – auch in Schaltjahren korrekt geklammert.
- Diese Trennung verhindert die Verwechslung von "1 Monat" und "30 Tage".
- Kodierung liegt in `OffsetPickerDialog.tsx` (`toOffset()`), Darstellung in `getOffsetLabel()` (`birthday.ts`), Berechnung in `calculateNotificationDate()` (`birthday.ts`).

## CI/CD (GitHub Actions)

| Workflow | Auslöser | Zweck |
|---|---|---|
| `ci.yml` | Push + PR auf main | Typecheck, Tests, Debug-APK (nur bei PR) |
| `fdroid-readiness.yml` | Push auf main/master, PR bei F-Droid-relevanten Dateiaenderungen, manuell | F-Droid Profil-Checks, Lizenz-Check, (bei Bedarf) Android Build-Smoke-Test |
| `auto-version.yml` | PR auf main gemergt | Version automatisch erhöhen (fix oder `[minor]`) |
| `release.yml` | Manuell | Signiertes Release-APK bauen + GitHub Release erstellen |
| `tests.yml` | Manuell | Ad-hoc Typecheck + Unit-Tests (nur bei Bedarf) |

Der `auto-version.yml` Workflow nutzt `.github/scripts/bump-version.cjs`, das:
- `package.json`, `app.json`, `android/app/build.gradle` und die F-Droid YAML aktualisiert.
- Legacy-`commit: HEAD` Eintraege (falls vorhanden) auf den vorherigen Tag umstellt.
- Einen neuen getaggten `commit: v<version>` Eintrag fuer die neue Version erstellt.
- Sicherstellt, dass der F-Droid Build-Befehl `assembleRelease -Pfdroid.build=true` verwendet.

Optimierungen fuer schnellere PR-Feedback-Zeiten:
- `ci.yml` und `fdroid-readiness.yml` brechen veraltete Runs derselben Branch automatisch ab (`concurrency`).
- `fdroid-readiness.yml` laeuft auf Pull Requests nur bei F-Droid-relevanten Dateiaenderungen.
- In `fdroid-readiness.yml` werden auf Pull Requests Typecheck/Unit-Tests nur dann ausgefuehrt, wenn `ci.yml` sie nicht abdeckt (z.B. `fdroid/**`-only PRs); ansonsten werden Doppelruns vermieden.

## F-Droid Readiness

- Checkliste: `FDROID_CHECKLIST.md`
- Metadaten-Entwurf: `fdroid/metadata/io.github.gametrojaner.geburtstage.yml`
- CI Workflow: `.github/workflows/fdroid-readiness.yml`
- F-Droid Build-JDK: `openjdk-21-jdk` (an fdroiddata-CI ausgerichtet)
- F-Droid Config-Checks ausfuehren:
   ```bash
   npm run fdroid:check
   ```
- F-Droid Metadaten-Invarianten und optionalen Driftvergleich ausfuehren:
   ```bash
   npm run fdroid:metadata:drift
   FDROID_METADATA_REF="https://gitlab.com/fdroid/fdroiddata/-/raw/master/metadata/io.github.gametrojaner.geburtstage.yml" npm run fdroid:metadata:drift
   ```
  Der Check validiert dabei sowohl die gepatchten Gradle-Abhaengigkeiten (`compileOnly`) als auch die
   Expo `local-maven-repo` Metadaten (`.pom`/`.module`) fuer `expo-application`, damit keine
   proprietaeren Runtime-Dependencies (Install Referrer) transitiv ins APK gelangen.
   Benachrichtigungen laufen nativ auf Android ueber `AlarmManager` + `BirthdayNotificationReceiver`
   (ohne `expo-notifications`).
- F-Droid Android-Build ausfuehren:
   ```bash
   npm run fdroid:android
   ```

## Features

- **Geburtstags-Übersicht**: Gruppiert nach Heute/Diese Woche/Monat/Nächster Monat/Später/Vergangen, Swipe-to-Hide auf der Startseite
- **Startseiten-Filter**: Umschaltbarer Filter `Alle` / `Favoriten` fuer die Geburtstagsliste
- **Kontakte ausblenden**: Swipe-Geste nach links zum Ausblenden, Undo-Snackbar, eigener Bildschirm zum Wiederherstellen (Einstellungen → Ausgeblendete Kontakte)
- **Kalender**: Interaktive Pan-Geste zum Monatswechsel (folgt dem Finger mit Spring-Animation), Tages-Auswahl mit Toggle, „Heute"-FAB-Button, Geburtstag zuweisen (Kontakt aus bestehender Liste wählen)
- **Foto-Zoom**: Antippen des Kontaktfotos in der Bearbeitungsansicht öffnet Vollbild-Overlay (bevorzugt hochaufgeloestes Base64-Bild, fallback auf RawImage/Image-URI)
- **Benachrichtigungen**: Pro Kontakt aktivierbar/deaktivierbar, Offset-Picker mit Zahl + Einheit (Tage/Wochen/Monate), eigene Uhrzeit; eigene Erinnerungen koennen separat gespeichert werden (unabhaengig vom Geburtstag-Write)
- **Favoriten & Pinned**: Schnellzugriff auf wichtige Kontakte
- **Export/Import**: Einstellungen als JSON exportieren/importieren; Datei-Picker zur nativen Dateiauswahl (expo-document-picker) beim Importieren. Beim Import werden Kontakt-Referenzen automatisch auf die aktuell vorhandene Kontaktliste bereinigt.
- **Konfiguration zurücksetzen**: Test-Button in Einstellungen zum Zurücksetzen aller Einstellungen auf Defaults (mit Sicherheitsbestätigung)
- **Mehrsprachig**: Deutsch/Englisch, System-Erkennung funktioniert korrekt
- **Dark/Light Mode**: System oder manuell
- **Android Widgets**: 2 Homescreen-Widgets (Upcoming + Favorites)
- **Widget-Aktualisierung**: Widgets werden bei relevanten Datenaenderungen in der App sofort aktualisiert (z.B. Favoriten, Geburtstagsaenderung, Widget-Theme/Eintragslimit) und zusaetzlich taeglich um Mitternacht per nativer Alarm-Resynchronisierung.
- **Boot-Reschedule ohne Foreground-Service**: Nach Reboot/Zeitaenderung markiert ein nativer Job (`JobScheduler`) ein ausstehendes Reschedule. Die eigentliche Notification-Neuplanung laeuft beim naechsten App-Start, wodurch kein `FOREGROUND_SERVICE_DATA_SYNC` mehr benoetigt wird.

## Projektstruktur

```
Geburtstage/
├── App.tsx                    # Root-Komponente (Theme, Navigation, i18n)
├── index.ts                   # Entry Point + Widget-Handler Registration
├── app.json                   # Expo-Konfiguration + Plugins
├── babel.config.js            # Babel mit Reanimated-Plugin
├── jest.config.js             # Jest-Konfiguration
├── tsconfig.json              # TypeScript-Konfiguration
├── package.json               # Abhängigkeiten & Scripts
├── src/
│   ├── components/
│   │   ├── BirthdayCard.tsx       # Geburtstags-Karte (Listenansicht)
│   │   ├── ContactAvatar.tsx      # Avatar-Komponente
│   │   └── OffsetPickerDialog.tsx # Offset-Picker (Zahl + Einheit: Tage/Wochen/Monate)
│   ├── i18n/
│   │   ├── index.ts           # i18next-Setup
│   │   ├── de.json            # Deutsche Übersetzungen
│   │   └── en.json            # Englische Übersetzungen
│   ├── navigation/
│   │   ├── AppNavigator.tsx   # Bottom-Tabs + Stack-Navigation
│   │   └── types.ts           # Navigation-Typen
│   ├── screens/
│   │   ├── HomeScreen.tsx         # Startseite (gruppierte Geburtstage, Swipe-to-Hide)
│   │   ├── ContactsScreen.tsx     # Kontakte (Swipe-to-Hide)
│   │   ├── EditBirthdayScreen.tsx # Geburtstag bearbeiten, Foto-Zoom, Offset-Picker
│   │   ├── CalendarScreen.tsx     # Kalender (Pan-Geste, Today-FAB, Geburtstag zuweisen)
│   │   ├── SettingsScreen.tsx     # Einstellungen, Offset-Picker
│   │   └── HiddenContactsScreen.tsx # Ausgeblendete Kontakte wiederherstellen
│   ├── services/
│   │   ├── contacts.ts        # Kontakte-API (lesen/schreiben)
│   │   ├── contacts.web.ts    # Web-Stub (gibt leere Daten zurück)
│   │   ├── database.ts        # SQLite (Settings, Favoriten, Hidden, Export)
│   │   ├── database.web.ts    # Web-Variante (localStorage statt SQLite)
│   │   ├── notifications.ts   # Push-Notifications
│   │   ├── notifications.web.ts # Web-Stub (No-op)
│   │   └── photoCache.ts      # Kontaktfoto-Cache für Widget-Avatare
│   ├── store/
│   │   └── index.ts           # Zustand State Management
│   ├── theme/
│   │   └── index.ts           # MD3 Light/Dark Themes
│   ├── types/
│   │   └── index.ts           # TypeScript-Interfaces
│   ├── utils/
│   │   └── birthday.ts        # Datums-Hilfsfunktionen
│   └── widget/
│       ├── BirthdayWidget.tsx  # Widget-UI
│       └── widgetTaskHandler.tsx # Widget-Datenlogik
└── __tests__/
    ├── birthday.test.ts       # Datums-/Gruppierungs-Tests
   ├── contacts.test.ts       # Kontakt-Write-Fallbacks + Native-Editor-Roundtrip
   ├── dev-workflow.test.ts   # Guardrails fuer Setup-Skripte und Copilot-Workflow-Regeln
   ├── settings-reset.test.ts # Reset-/Import-/Export-Regressionstests
    ├── types.test.ts          # Default-Settings-Tests
    ├── store.test.ts          # Store-Aktionen-Tests
    ├── i18n.test.ts           # Übersetzungs-Vollständigkeit
    └── export.test.ts         # Export/Import-Format-Tests
```

## Tech Stack

| Bereich | Technologie |
|---|---|
| Framework | React Native + Expo SDK 55 |
| Sprache | TypeScript 5.9 |
| UI | React Native Paper (Material Design 3) |
| Navigation | React Navigation 7 (Bottom Tabs + Native Stack) |
| State | Zustand 5 |
| Datenbank | expo-sqlite (lokal) |
| Kontakte | expo-contacts |
| Notifications | Native Android (AlarmManager + NotificationManager) |
| Kalender | react-native-calendars |
| i18n | i18next + react-i18next (DE/EN) |
| Widgets | react-native-android-widget |
| Gesten | react-native-gesture-handler (Swipe-to-Hide, Kalender-Swipe) |
| Animationen | react-native-reanimated 4 |
| Tests | Jest 29 + Testing Library |

Hinweis: Die native Reminder-Implementierung ist aktuell Android-spezifisch. Unter iOS sind lokale Erinnerungen in diesem Stand nicht aktiv.
