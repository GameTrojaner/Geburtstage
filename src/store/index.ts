import { create } from 'zustand';
import { AppSettings, ContactBirthday, DEFAULT_SETTINGS, NotificationSetting } from '../types';

// These imports are fine on native (Android/iOS). On web, the store actions
// guard with try/catch so even if the modules have limited web support,
// the app won't crash.
import * as db from '../services/database';
import * as contactsService from '../services/contacts';
import * as notificationsService from '../services/notifications';

interface AppState {
  // Contacts
  contacts: ContactBirthday[];
  contactsLoading: boolean;
  hasContactsPermission: boolean;

  // Settings
  settings: AppSettings;

  // Favorites & Pinned
  favorites: Set<string>;
  pinned: Set<string>;
  hidden: Set<string>;

  // Notification settings per contact
  notificationSettings: Map<string, NotificationSetting>;

  // Actions
  loadContacts: () => Promise<void>;
  refreshContact: (contactId: string) => Promise<void>;
  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  loadFavorites: () => Promise<void>;
  toggleFavorite: (contactId: string) => Promise<void>;
  loadPinned: () => Promise<void>;
  togglePinned: (contactId: string) => Promise<void>;
  loadHidden: () => Promise<void>;
  hideContact: (contactId: string) => Promise<void>;
  unhideContact: (contactId: string) => Promise<void>;
  loadNotificationSettings: () => Promise<void>;
  updateNotificationSetting: (setting: NotificationSetting) => Promise<void>;
  deleteNotificationSetting: (contactId: string) => Promise<void>;
  rescheduleNotifications: () => Promise<void>;
  setHasContactsPermission: (value: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  contacts: [],
  contactsLoading: false,
  hasContactsPermission: false,

  settings: DEFAULT_SETTINGS,

  favorites: new Set<string>(),
  pinned: new Set<string>(),
  hidden: new Set<string>(),

  notificationSettings: new Map<string, NotificationSetting>(),

  loadContacts: async () => {
    set({ contactsLoading: true });
    try {
      const contacts = await contactsService.getAllContacts();
      set({ contacts, contactsLoading: false });
    } catch (error) {
      console.error('Error loading contacts:', error);
      set({ contactsLoading: false });
    }
  },

  refreshContact: async (contactId: string) => {
    try {
      const updated = await contactsService.getContactById(contactId);
      if (updated) {
        set(state => ({
          contacts: state.contacts.map(c =>
            c.contactId === contactId ? updated : c
          ),
        }));
      }
    } catch (error) {
      console.error('Error refreshing contact:', error);
    }
  },

  loadSettings: async () => {
    try {
      const settings = await db.getSettings();
      set({ settings });
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  },

  updateSetting: async (key, value) => {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      await db.saveSetting(key, stringValue);
    } catch (error) {
      console.error('Error saving setting:', error);
    }
    set(state => ({
      settings: { ...state.settings, [key]: value },
    }));
  },

  loadFavorites: async () => {
    try {
      const favs = await db.getFavorites();
      set({ favorites: new Set(favs) });
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  },

  toggleFavorite: async (contactId: string) => {
    const { favorites } = get();
    try {
      if (favorites.has(contactId)) {
        await db.removeFavorite(contactId);
        const newFavs = new Set(favorites);
        newFavs.delete(contactId);
        set({ favorites: newFavs });
      } else {
        await db.addFavorite(contactId);
        const newFavs = new Set(favorites);
        newFavs.add(contactId);
        set({ favorites: newFavs });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  },

  loadPinned: async () => {
    try {
      const pins = await db.getPinned();
      set({ pinned: new Set(pins) });
    } catch (error) {
      console.error('Error loading pinned:', error);
    }
  },

  togglePinned: async (contactId: string) => {
    const { pinned } = get();
    try {
      if (pinned.has(contactId)) {
        await db.removePinned(contactId);
        const newPins = new Set(pinned);
        newPins.delete(contactId);
        set({ pinned: newPins });
      } else {
        await db.addPinned(contactId);
        const newPins = new Set(pinned);
        newPins.add(contactId);
        set({ pinned: newPins });
      }
    } catch (error) {
      console.error('Error toggling pinned:', error);
    }
  },

  loadHidden: async () => {
    try {
      const list = await db.getHidden();
      set({ hidden: new Set(list) });
    } catch (error) {
      console.error('Error loading hidden:', error);
    }
  },

  hideContact: async (contactId: string) => {
    try {
      await db.addHidden(contactId);
      const newHidden = new Set(get().hidden);
      newHidden.add(contactId);
      set({ hidden: newHidden });
    } catch (error) {
      console.error('Error hiding contact:', error);
    }
  },

  unhideContact: async (contactId: string) => {
    try {
      await db.removeHidden(contactId);
      const newHidden = new Set(get().hidden);
      newHidden.delete(contactId);
      set({ hidden: newHidden });
    } catch (error) {
      console.error('Error unhiding contact:', error);
    }
  },

  loadNotificationSettings: async () => {
    try {
      const all = await db.getAllNotificationSettings();
      const map = new Map<string, NotificationSetting>();
      for (const ns of all) {
        map.set(ns.contactId, ns);
      }
      set({ notificationSettings: map });
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  },

  updateNotificationSetting: async (setting: NotificationSetting) => {
    try {
      await db.saveNotificationSetting(setting);
    } catch (error) {
      console.error('Error updating notification setting:', error);
    }
    set(state => {
      const map = new Map(state.notificationSettings);
      map.set(setting.contactId, setting);
      return { notificationSettings: map };
    });
  },

  deleteNotificationSetting: async (contactId: string) => {
    try {
      await db.deleteNotificationSetting(contactId);
    } catch (error) {
      console.error('Error deleting notification setting:', error);
    }
    set(state => {
      const map = new Map(state.notificationSettings);
      map.delete(contactId);
      return { notificationSettings: map };
    });
  },

  rescheduleNotifications: async () => {
    try {
      const { contacts } = get();
      await notificationsService.scheduleAllNotifications(contacts);
    } catch (error) {
      console.error('Error rescheduling notifications:', error);
    }
  },

  setHasContactsPermission: (value: boolean) => {
    set({ hasContactsPermission: value });
  },
}));
