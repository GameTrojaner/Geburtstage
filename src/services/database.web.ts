/**
 * Web-specific database service using localStorage.
 * Metro automatically picks this file over database.ts for web builds,
 * avoiding the expo-sqlite WASM dependency issue.
 */
import { AppSettings, DEFAULT_SETTINGS, NotificationSetting } from '../types';

const STORAGE_PREFIX = 'geburtstage_';

function getItem(key: string): string | null {
  try {
    return localStorage.getItem(STORAGE_PREFIX + key);
  } catch {
    return null;
  }
}

function setItem(key: string, value: string): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, value);
  } catch {
    // localStorage might be full or unavailable
  }
}

// --- Settings ---

export async function getSettings(): Promise<AppSettings> {
  const raw = getItem('settings');
  if (raw) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {}
  }
  return { ...DEFAULT_SETTINGS };
}

export async function saveSetting(key: string, value: string): Promise<void> {
  const settings = await getSettings();
  (settings as any)[key] = value === 'true' ? true : value === 'false' ? false : value;
  // Try to parse JSON values (arrays, objects)
  try {
    (settings as any)[key] = JSON.parse(value);
  } catch {
    // keep as string
  }
  setItem('settings', JSON.stringify(settings));
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  setItem('settings', JSON.stringify(settings));
}

// --- Notification Settings per Contact ---

function getNotificationSettingsMap(): Record<string, NotificationSetting> {
  const raw = getItem('notificationSettings');
  if (raw) {
    try { return JSON.parse(raw); } catch {}
  }
  return {};
}

function saveNotificationSettingsMap(map: Record<string, NotificationSetting>): void {
  setItem('notificationSettings', JSON.stringify(map));
}

export async function getNotificationSetting(contactId: string): Promise<NotificationSetting | null> {
  return getNotificationSettingsMap()[contactId] ?? null;
}

export async function getAllNotificationSettings(): Promise<NotificationSetting[]> {
  return Object.values(getNotificationSettingsMap());
}

export async function saveNotificationSetting(setting: NotificationSetting): Promise<void> {
  const map = getNotificationSettingsMap();
  map[setting.contactId] = setting;
  saveNotificationSettingsMap(map);
}

export async function deleteNotificationSetting(contactId: string): Promise<void> {
  const map = getNotificationSettingsMap();
  delete map[contactId];
  saveNotificationSettingsMap(map);
}

// --- Favorites ---

function getFavoritesSet(): string[] {
  const raw = getItem('favorites');
  if (raw) {
    try { return JSON.parse(raw); } catch {}
  }
  return [];
}

export async function getFavorites(): Promise<string[]> {
  return getFavoritesSet();
}

export async function addFavorite(contactId: string): Promise<void> {
  const favs = getFavoritesSet();
  if (!favs.includes(contactId)) {
    favs.push(contactId);
    setItem('favorites', JSON.stringify(favs));
  }
}

export async function removeFavorite(contactId: string): Promise<void> {
  const favs = getFavoritesSet().filter(id => id !== contactId);
  setItem('favorites', JSON.stringify(favs));
}

// --- Pinned ---

function getPinnedList(): string[] {
  const raw = getItem('pinned');
  if (raw) {
    try { return JSON.parse(raw); } catch {}
  }
  return [];
}

export async function getPinned(): Promise<string[]> {
  return getPinnedList();
}

export async function addPinned(contactId: string): Promise<void> {
  const pins = getPinnedList();
  if (!pins.includes(contactId)) {
    pins.push(contactId);
    setItem('pinned', JSON.stringify(pins));
  }
}

export async function removePinned(contactId: string): Promise<void> {
  const pins = getPinnedList().filter(id => id !== contactId);
  setItem('pinned', JSON.stringify(pins));
}

// --- Hidden ---

function getHiddenList(): string[] {
  const raw = getItem('hidden');
  if (raw) {
    try { return JSON.parse(raw); } catch {}
  }
  return [];
}

export async function getHidden(): Promise<string[]> {
  return getHiddenList();
}

export async function addHidden(contactId: string): Promise<void> {
  const list = getHiddenList();
  if (!list.includes(contactId)) {
    list.push(contactId);
    setItem('hidden', JSON.stringify(list));
  }
}

export async function removeHidden(contactId: string): Promise<void> {
  const list = getHiddenList().filter(id => id !== contactId);
  setItem('hidden', JSON.stringify(list));
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
  const nsMap: Record<string, NotificationSetting> = {};
  for (const ns of data.notificationSettings) {
    nsMap[ns.contactId] = ns;
  }
  saveNotificationSettingsMap(nsMap);
  setItem('favorites', JSON.stringify(data.favorites));
  setItem('pinned', JSON.stringify(data.pinned));
  setItem('hidden', JSON.stringify(data.hidden ?? []));
}
