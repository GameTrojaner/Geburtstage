# Geburtstage App – Projekt-Kontext

> Diese Datei enthält alle Informationen, die ein KI-Assistent (oder Entwickler) braucht,
> um in einer neuen Sitzung am Projekt weiterzuarbeiten, ohne den ursprünglichen Chat-Verlauf.

## Projektziel

Birthday Reminder App für Android (primär) und iOS.
Liest Geburtstage aus den Telefonkontakten und zeigt sie gruppiert an.
Kann Geburtstage direkt in die Kontakte schreiben.
Unterstützt Notifications, Kalenderansicht, Favoriten, Homescreen-Widgets, Export/Import, Dark/Light Mode, DE/EN.

## Tech Stack

- **React Native + Expo SDK 55** (`expo@~55.0.8`, `react@19.2.0`, `react-native@0.83.2`)
- **TypeScript 5.9** (strict mode)
- **React Native Paper** (Material Design 3) mit Teal-Farbschema (`#00897B`)
- **React Navigation 7** (Bottom Tabs: Home, Kontakte, Kalender, Einstellungen + Native Stack für Edit)
- **Zustand 5** (globaler State)
- **expo-sqlite** (lokale Datenbank für Settings, Favoriten, Pinned, Hidden, Notification-Settings)
- **expo-contacts** (Lesen/Schreiben von Kontakten und Geburtstagen)
- **expo-notifications** (Geburtstags-Erinnerungen mit konfigurierbaren Offsets)
- **react-native-gesture-handler** (Swipe-to-Hide, Kalender-Monatswechsel)
- **react-native-calendars** (Monatsansicht mit Multi-Dot-Markierungen, enableSwipeMonths)
- **i18next + react-i18next** (DE + EN, ~120 Keys pro Sprache)
- **react-native-android-widget** (2 Widgets: Upcoming + Favorites)
- **react-native-reanimated 4** + **react-native-worklets** (Animationen)
- **Jest 30** + **@testing-library/react-native** (60 Tests, 5 Suites)

## Projektstruktur

```
E:\Dev\Geburtstage\
├── App.tsx                          # Root: GestureHandlerRootView, PaperProvider, NavigationContainer, i18n init, Theme
├── index.ts                         # registerRootComponent + registerWidgetTaskHandler
├── app.json                         # Expo-Config mit Plugins (contacts, notifications, android-widget)
├── babel.config.js                  # babel-preset-expo + react-native-reanimated/plugin
├── jest.config.js                   # babel-jest (kein jest-expo preset), testEnvironment: node
├── tsconfig.json                    # extends expo/tsconfig.base, strict: true
├── package.json                     # Alle deps gelockt
├── setup-dev.ps1                    # Script für neue Entwicklungsumgebung (Windows)
├── setup-dev.sh                     # Script für neue Entwicklungsumgebung (Linux/macOS)
├── README.md                        # Befehle & Anleitungen
│
├── src/
│   ├── types/index.ts               # ContactBirthday, NotificationSetting, AppSettings, DEFAULT_SETTINGS
│   ├── theme/index.ts               # MD3 Light (#00897B) + Dark (#4FDBB7) Themes
│   ├── i18n/
│   │   ├── index.ts                 # i18next setup mit expo-localization
│   │   ├── de.json                  # Deutsche Übersetzungen
│   │   └── en.json                  # Englische Übersetzungen
│   ├── services/
│   │   ├── database.ts              # SQLite: tables settings, notification_settings, favorites, pinned, hidden
│   │   │                            #   CRUD + exportAllData/importAllData (version 1 format)
│   │   │                            #   DB-Name: geburtstage.db
│   │   ├── database.web.ts          # Web-Variante: localStorage statt expo-sqlite
│   │   ├── contacts.ts              # expo-contacts wrapper, 0-indexed month conversion, RawImage+Image fetch,
│   │   │                            #   createContactWithBirthday()
│   │   ├── contacts.web.ts          # Web-Stub: gibt leere Daten zurück
│   │   ├── notifications.ts         # Lazy import via expo-constants (skips in Expo Go)
│   │   │                            #   scheduleAllNotifications: cancels all, re-schedules per contact
│   │   └── notifications.web.ts     # Web-Stub: No-op
│   ├── store/index.ts               # Zustand store mit:
│   │                                #   contacts[], settings, favorites Set, pinned Set,
│   │                                #   notificationSettings Map, alle async actions
│   ├── utils/birthday.ts            # getDaysUntilBirthday, getAge, getUpcomingAge, formatBirthday,
│   │                                #   formatBirthdayISO, groupBirthdayContacts, getInitials, getDaysInMonth,
│   │                                #   getOffsetLabel (shared: Tage/Wochen/Monate Anzeige)
│   ├── components/
│   │   ├── BirthdayCard.tsx         # Karte mit Avatar, Name, Alter, Tage bis, Pin/Fav-Aktionen
│   │   ├── ContactAvatar.tsx        # Avatar mit Bild oder Initialen
│   │   └── OffsetPickerDialog.tsx   # Shared Offset-Picker (Zahl + Einheit: Tage/Wochen/Monate)
│   ├── screens/
│   │   ├── HomeScreen.tsx           # FlatList, Gruppen (Pinned/Heute/Woche/Monat/Nächster/Später/Vergangen), Swipe-to-Hide
│   │   ├── ContactsScreen.tsx       # Searchbar + Chip-Filter + Swipe-to-Hide (Snackbar mit Undo)
│   │   ├── EditBirthdayScreen.tsx   # Tag/Monat/Jahr inline, Foto-Zoom-Modal, OffsetPickerDialog, prefillDay/prefillMonth
│   │   ├── CalendarScreen.tsx       # Pan-Geste (folgt Finger, Spring-Animation), Today-FAB, Tag-Toggle,
│   │   │                            #   Geburtstag zuweisen (Kontakt wählen / neuen Kontakt erstellen)
│   │   ├── SettingsScreen.tsx       # Theme, Sprache, Notifications, OffsetPickerDialog, Export/Import
│   │   └── HiddenContactsScreen.tsx # Vollbild-Ansicht ausgeblendeter Kontakte (FlatList + Show-Button)
│   ├── navigation/
│   │   ├── AppNavigator.tsx         # Bottom Tabs (Home, Contacts, Calendar, Settings) + Stack (EditBirthday, HiddenContacts)
│   │   └── types.ts                 # RootStackParamList (MainTabs, EditBirthday + prefill, HiddenContacts), TabParamList
│   └── widget/
│       ├── BirthdayWidget.tsx       # FlexWidget/TextWidget/ListWidget (Light Theme)
│       └── widgetTaskHandler.tsx    # Lädt Kontakte + Favoriten aus SQLite, rendert Widget
│
└── __tests__/
    ├── birthday.test.ts             # Datums-/Gruppierungs-Tests (fake timer: 27.03.2026)
    ├── types.test.ts                # DEFAULT_SETTINGS Werte
    ├── store.test.ts                # Mocked DB/Contacts/Notifications, testet alle Store-Aktionen
    ├── i18n.test.ts                 # DE/EN haben identische Keys, keine leeren Werte
    └── export.test.ts               # ExportData Format, JSON Roundtrip, Offsets-Reihenfolge
```

## Wichtige Interfaces

```typescript
interface ContactBirthday {
  contactId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  imageUri?: string;
  rawImageUri?: string;
  imageBase64?: string;
  birthday?: { day: number; month: number; year?: number; };
}

interface AppSettings {
  theme: 'system' | 'light' | 'dark';
  language: 'system' | 'de' | 'en';
  notificationsEnabled: boolean;
  defaultNotificationOffsets: number[];   // z.B. [0, 1, 7] = am Tag, 1 Tag vorher, 1 Woche vorher
  defaultNotificationTime: string;        // "09:00"
  confirmBeforeWriting: boolean;
}

interface NotificationSetting {
  contactId: string;
  enabled: boolean;
  offsets: number[];
  time: string;   // "HH:mm"
}
```

## SQLite Tabellen

- `settings` – key/value Paare für AppSettings
- `notification_settings` – JSON pro contactId (enabled, offsets, time)
- `favorites` – contact_id Einträge
- `pinned` – contact_id Einträge
- `hidden` – contact_id Einträge (ausgeblendete Kontakte)

## Widgets (Android)

Zwei Widgets in app.json konfiguriert:
1. **BirthdayUpcoming** – Zeigt die nächsten 3 Geburtstage
2. **BirthdayFavorites** – Zeigt Geburtstage der Favoriten

Registriert in `index.ts` via `registerWidgetTaskHandler`.
Reagiert auf: WIDGET_ADDED, WIDGET_UPDATE, WIDGET_RESIZED.

## Bekannte Einschränkungen / Hinweise

- **npm install** muss mit `--legacy-peer-deps` ausgeführt werden (React 19 Peer-Dep-Konflikte)
- **react-dom** muss exakt die gleiche Version wie `react` haben (beide 19.2.0), sonst weiße Seite im Browser
- **Expo Go** kann nicht alles: Kontakte schreiben, Notifications, Widgets brauchen `npx expo run:android`
- **Expo Go + Notifications**: Seit SDK 53 wurden Push-Notifications aus Expo Go entfernt. Die App erkennt Expo Go via `expo-constants` (ExecutionEnvironment.StoreClient) und überspringt den Import von expo-notifications komplett.
- **GestureHandlerRootView**: Umschließt die gesamte App in App.tsx — nötig für Swipeable (Kontakte ausblenden) und Kalender-Swipe.
- **Kontakte ausblenden**: Swipe nach links in ContactsScreen und HomeScreen → Snackbar mit Undo. Ausgeblendete werden überall gefiltert (Home, Kalender, Kontakte). Wiederherstellen über eigenen Bildschirm: Einstellungen → „Ausgeblendete Kontakte" (HiddenContactsScreen).
- **Vergangen-Gruppe**: Geburtstage die in diesem Jahr schon vorbei sind, erscheinen am Ende der HomeScreen-Liste in der Gruppe „Vergangen".
- **Sprache System**: Beim Wechsel auf „System" wird die Gerätesprache per expo-localization erkannt und aktiv gesetzt (nicht nur beim App-Start).
- **Notification UX**: Aktivieren/Deaktivieren ist jetzt Top-Level (nicht mehr unter „Eigene Erinnerungen"). Der „+" Button für Offsets wird nur gezeigt wenn noch Optionen verfügbar sind.
- **Offset-Picker**: Shared OffsetPickerDialog-Komponente (Zahl + Einheit: Tage/Wochen/Monate). Wird in EditBirthdayScreen und SettingsScreen verwendet.
- **Kalender**: Interaktive Pan-Geste (GestureDetector, folgt dem Finger via onUpdate/translateX, Spring-back bei unvollständigem Swipe, Velocity-Trigger). FAB „Heute" wenn nicht aktueller Monat. Tag-Toggle (erneutes Tippen deselektiert), „Alle im Monat zeigen" Chip, „Geburtstag zuweisen" Button öffnet Kontakt-Auswahl-Modal, „Neuen Kontakt erstellen" Dialog.
- **Foto-Zoom**: Antippen des Kontaktfotos in EditBirthdayScreen öffnet Vollbild-Overlay. Bildquelle-Priorität: imageBase64 → rawImageUri → imageUri.
- **Kontakte-Sortierung**: ContactsScreen sortiert rein alphabetisch (keine Favoriten-Priorisierung mehr).
- **Expo Go Version**: Play Store Version oft veraltet — APK von https://expo.dev/go empfohlen
- **Web-Support**: `.web.ts` Stubs für database (localStorage), contacts (leere Daten) und notifications (no-op). Metro wählt automatisch die `.web.ts` Variante.
- **TLS-Fehler**: Firmennetzwerke/VPNs können TLS-Fehler verursachen. Workaround: `$env:NODE_TLS_REJECT_UNAUTHORIZED="0"` vor dem Befehl.
- **expo-file-system v55** nutzt neue API: `Paths.document`, `new File()` statt `documentDirectory`
- **expo-contacts**: Monate sind 0-indexed (Januar = 0) – wird in contacts.ts konvertiert. Felder: Fields.RawImage + Fields.Image für hochauflösende Fotos, Fields.Birthday für Geburtstag.
- **Widget**: Nur Light-Theme implementiert (kein Dark-Widget)
- **Widget-Handler**: Wird in index.ts nur auf Android registriert (dynamischer Import)
- **jest.config.js**: Nutzt `babel-jest` direkt (nicht jest-expo preset) wegen Kompatibilität mit Expo SDK 55
- **react-native-worklets**: Wird von reanimated 4.x babel plugin benötigt, muss installiert sein

## Befehle

```bash
npm install --legacy-peer-deps    # Abhängigkeiten installieren
npx expo start                    # Dev-Server (Expo Go)
npx expo start --web              # Browser-Preview
npx expo run:android              # Development Build (voller nativer Zugriff)
npm test                          # Unit Tests (60 Tests, 5 Suites)
npm run test:coverage             # Tests mit Coverage
npx tsc --noEmit                  # TypeScript Check
```

## Stand: März 2026

- TypeScript: 0 Fehler
- Tests: 60/60 bestanden
- Alle Screens implementiert
- i18n komplett (DE + EN)
- 2 Android Widgets konfiguriert
- Export/Import funktionsfähig
- Web-Version funktioniert im Browser (Settings, Navigation, Themes)
- Expo Go: App startet, Kontakte lesbar, Notifications graceful degraded
- Noch nicht auf echtem Gerät mit Dev Build getestet

## Nächste mögliche Schritte

- App auf echtem Android-Gerät testen
- App-Icon und Splash-Screen Assets erstellen
- Widget-Preview-Bilder erstellen
- E2E Tests hinzufügen (Detox oder Maestro)
- iOS-spezifische Anpassungen
- Play Store / App Store Veröffentlichung vorbereiten
- Performance-Optimierung bei vielen Kontakten (>1000)
