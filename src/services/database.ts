import * as SQLite from 'expo-sqlite';
import { AppSettings, DEFAULT_SETTINGS, NotificationSetting } from '../types';

const DB_NAME = 'geburtstage.db';

let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await initDb(db);
  }
  return db;
}

async function initDb(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notification_settings (
      contact_id TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1,
      offsets TEXT NOT NULL DEFAULT '[0]',
      time TEXT NOT NULL DEFAULT '09:00'
    );

    CREATE TABLE IF NOT EXISTS favorites (
      contact_id TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS pinned (
      contact_id TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS hidden (
      contact_id TEXT PRIMARY KEY
    );
  `);
}

// --- Settings ---

export async function getSettings(): Promise<AppSettings> {
  const database = await getDb();
  const rows = await database.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings'
  );
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return {
    theme: (settings.theme as AppSettings['theme']) ?? DEFAULT_SETTINGS.theme,
    language: (settings.language as AppSettings['language']) ?? DEFAULT_SETTINGS.language,
    notificationsEnabled: settings.notificationsEnabled !== undefined
      ? settings.notificationsEnabled === 'true'
      : DEFAULT_SETTINGS.notificationsEnabled,
    defaultNotificationOffsets: settings.defaultNotificationOffsets
      ? JSON.parse(settings.defaultNotificationOffsets)
      : DEFAULT_SETTINGS.defaultNotificationOffsets,
    defaultNotificationTime: settings.defaultNotificationTime ?? DEFAULT_SETTINGS.defaultNotificationTime,
    confirmBeforeWriting: settings.confirmBeforeWriting !== undefined
      ? settings.confirmBeforeWriting === 'true'
      : DEFAULT_SETTINGS.confirmBeforeWriting,
  };
}

export async function saveSetting(key: string, value: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const entries: [string, string][] = [
    ['theme', settings.theme],
    ['language', settings.language],
    ['notificationsEnabled', String(settings.notificationsEnabled)],
    ['defaultNotificationOffsets', JSON.stringify(settings.defaultNotificationOffsets)],
    ['defaultNotificationTime', settings.defaultNotificationTime],
    ['confirmBeforeWriting', String(settings.confirmBeforeWriting)],
  ];
  for (const [key, value] of entries) {
    await saveSetting(key, value);
  }
}

// --- Notification Settings per Contact ---

export async function getNotificationSetting(contactId: string): Promise<NotificationSetting | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<{
    contact_id: string;
    enabled: number;
    offsets: string;
    time: string;
  }>('SELECT * FROM notification_settings WHERE contact_id = ?', [contactId]);

  if (!row) return null;
  return {
    contactId: row.contact_id,
    enabled: row.enabled === 1,
    offsets: JSON.parse(row.offsets),
    time: row.time,
  };
}

export async function getAllNotificationSettings(): Promise<NotificationSetting[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{
    contact_id: string;
    enabled: number;
    offsets: string;
    time: string;
  }>('SELECT * FROM notification_settings');

  return rows.map(row => ({
    contactId: row.contact_id,
    enabled: row.enabled === 1,
    offsets: JSON.parse(row.offsets),
    time: row.time,
  }));
}

export async function saveNotificationSetting(setting: NotificationSetting): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    'INSERT OR REPLACE INTO notification_settings (contact_id, enabled, offsets, time) VALUES (?, ?, ?, ?)',
    [setting.contactId, setting.enabled ? 1 : 0, JSON.stringify(setting.offsets), setting.time]
  );
}

export async function deleteNotificationSetting(contactId: string): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM notification_settings WHERE contact_id = ?', [contactId]);
}

// --- Favorites ---

export async function getFavorites(): Promise<string[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{ contact_id: string }>('SELECT contact_id FROM favorites');
  return rows.map(r => r.contact_id);
}

export async function addFavorite(contactId: string): Promise<void> {
  const database = await getDb();
  await database.runAsync('INSERT OR IGNORE INTO favorites (contact_id) VALUES (?)', [contactId]);
}

export async function removeFavorite(contactId: string): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM favorites WHERE contact_id = ?', [contactId]);
}

// --- Pinned ---

export async function getPinned(): Promise<string[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{ contact_id: string }>('SELECT contact_id FROM pinned');
  return rows.map(r => r.contact_id);
}

export async function addPinned(contactId: string): Promise<void> {
  const database = await getDb();
  await database.runAsync('INSERT OR IGNORE INTO pinned (contact_id) VALUES (?)', [contactId]);
}

export async function removePinned(contactId: string): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM pinned WHERE contact_id = ?', [contactId]);
}

// --- Hidden ---

export async function getHidden(): Promise<string[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{ contact_id: string }>('SELECT contact_id FROM hidden');
  return rows.map(r => r.contact_id);
}

export async function addHidden(contactId: string): Promise<void> {
  const database = await getDb();
  await database.runAsync('INSERT OR IGNORE INTO hidden (contact_id) VALUES (?)', [contactId]);
}

export async function removeHidden(contactId: string): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM hidden WHERE contact_id = ?', [contactId]);
}

// --- Export / Import ---

export interface ExportData {
  version: 1;
  settings: AppSettings;
  notificationSettings: NotificationSetting[];
  favorites: string[];
  pinned: string[];
  hidden: string[];
}

export async function exportAllData(): Promise<ExportData> {
  const settings = await getSettings();
  const notificationSettings = await getAllNotificationSettings();
  const favorites = await getFavorites();
  const pinned = await getPinned();
  const hidden = await getHidden();
  return { version: 1, settings, notificationSettings, favorites, pinned, hidden };
}

export async function importAllData(data: ExportData): Promise<void> {
  if (data.version !== 1) throw new Error('Unsupported export version');

  await saveSettings(data.settings);

  const database = await getDb();
  await database.runAsync('DELETE FROM notification_settings');
  for (const ns of data.notificationSettings) {
    await saveNotificationSetting(ns);
  }

  await database.runAsync('DELETE FROM favorites');
  for (const fav of data.favorites) {
    await addFavorite(fav);
  }

  await database.runAsync('DELETE FROM pinned');
  for (const pin of data.pinned) {
    await addPinned(pin);
  }

  await database.runAsync('DELETE FROM hidden');
  for (const h of data.hidden ?? []) {
    await addHidden(h);
  }
}
