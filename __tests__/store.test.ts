/**
 * Tests for the Zustand store actions.
 * We mock the database and contacts services to test store logic in isolation.
 */

// Mock services before importing store
jest.mock('../src/services/database', () => ({
  getSettings: jest.fn().mockResolvedValue({
    theme: 'system',
    language: 'system',
    notificationsEnabled: true,
    defaultNotificationOffsets: [0],
    defaultNotificationTime: '09:00',
    confirmBeforeWriting: true,
  }),
  saveSetting: jest.fn().mockResolvedValue(undefined),
  saveSettings: jest.fn().mockResolvedValue(undefined),
  getFavorites: jest.fn().mockResolvedValue(['fav1', 'fav2']),
  addFavorite: jest.fn().mockResolvedValue(undefined),
  removeFavorite: jest.fn().mockResolvedValue(undefined),
  getPinned: jest.fn().mockResolvedValue(['pin1']),
  addPinned: jest.fn().mockResolvedValue(undefined),
  removePinned: jest.fn().mockResolvedValue(undefined),
  getHidden: jest.fn().mockResolvedValue(['hidden1']),
  addHidden: jest.fn().mockResolvedValue(undefined),
  removeHidden: jest.fn().mockResolvedValue(undefined),
  getAllNotificationSettings: jest.fn().mockResolvedValue([]),
  saveNotificationSetting: jest.fn().mockResolvedValue(undefined),
  deleteNotificationSetting: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/contacts', () => ({
  getAllContacts: jest.fn().mockResolvedValue([
    { contactId: '1', name: 'Alice', birthday: { day: 15, month: 4, year: 1990 } },
    { contactId: '2', name: 'Bob', birthday: { day: 25, month: 12 } },
    { contactId: '3', name: 'Carol' },
  ]),
  getContactById: jest.fn().mockImplementation((id: string) => {
    if (id === '1') return Promise.resolve({ contactId: '1', name: 'Alice Updated', birthday: { day: 15, month: 4, year: 1990 } });
    return Promise.resolve(null);
  }),
}));

jest.mock('../src/services/notifications', () => ({
  scheduleAllNotifications: jest.fn().mockResolvedValue(undefined),
}));

import { useAppStore } from '../src/store';

// Reset store between tests
beforeEach(() => {
  useAppStore.setState({
    contacts: [],
    contactsLoading: false,
    hasContactsPermission: false,
    favorites: new Set(),
    pinned: new Set(),
    hidden: new Set(),
    notificationSettings: new Map(),
  });
});

describe('Store - loadContacts', () => {
  it('loads contacts from service', async () => {
    await useAppStore.getState().loadContacts();
    const { contacts, contactsLoading } = useAppStore.getState();
    expect(contacts).toHaveLength(3);
    expect(contacts[0].name).toBe('Alice');
    expect(contactsLoading).toBe(false);
  });
});

describe('Store - loadSettings', () => {
  it('loads settings from database', async () => {
    await useAppStore.getState().loadSettings();
    const { settings } = useAppStore.getState();
    expect(settings.theme).toBe('system');
    expect(settings.notificationsEnabled).toBe(true);
  });
});

describe('Store - favorites', () => {
  it('loads favorites', async () => {
    await useAppStore.getState().loadFavorites();
    const { favorites } = useAppStore.getState();
    expect(favorites.has('fav1')).toBe(true);
    expect(favorites.has('fav2')).toBe(true);
    expect(favorites.size).toBe(2);
  });

  it('toggles favorite on', async () => {
    await useAppStore.getState().toggleFavorite('new-fav');
    const { favorites } = useAppStore.getState();
    expect(favorites.has('new-fav')).toBe(true);
  });

  it('toggles favorite off', async () => {
    useAppStore.setState({ favorites: new Set(['existing']) });
    await useAppStore.getState().toggleFavorite('existing');
    const { favorites } = useAppStore.getState();
    expect(favorites.has('existing')).toBe(false);
  });
});

describe('Store - pinned', () => {
  it('loads pinned', async () => {
    await useAppStore.getState().loadPinned();
    const { pinned } = useAppStore.getState();
    expect(pinned.has('pin1')).toBe(true);
    expect(pinned.size).toBe(1);
  });

  it('toggles pinned on', async () => {
    await useAppStore.getState().togglePinned('new-pin');
    const { pinned } = useAppStore.getState();
    expect(pinned.has('new-pin')).toBe(true);
  });

  it('toggles pinned off', async () => {
    useAppStore.setState({ pinned: new Set(['existing-pin']) });
    await useAppStore.getState().togglePinned('existing-pin');
    const { pinned } = useAppStore.getState();
    expect(pinned.has('existing-pin')).toBe(false);
  });
});

describe('Store - hidden', () => {
  it('loads hidden contacts', async () => {
    await useAppStore.getState().loadHidden();
    const { hidden } = useAppStore.getState();
    expect(hidden.has('hidden1')).toBe(true);
    expect(hidden.size).toBe(1);
  });

  it('hides a contact', async () => {
    await useAppStore.getState().hideContact('new-hidden');
    const { hidden } = useAppStore.getState();
    expect(hidden.has('new-hidden')).toBe(true);
  });

  it('unhides a contact', async () => {
    useAppStore.setState({ hidden: new Set(['existing-hidden']) });
    await useAppStore.getState().unhideContact('existing-hidden');
    const { hidden } = useAppStore.getState();
    expect(hidden.has('existing-hidden')).toBe(false);
  });
});

describe('Store - refreshContact', () => {
  it('updates a single contact in the list', async () => {
    useAppStore.setState({
      contacts: [
        { contactId: '1', name: 'Alice', birthday: { day: 15, month: 4, year: 1990 } },
        { contactId: '2', name: 'Bob', birthday: { day: 25, month: 12 } },
      ],
    });
    await useAppStore.getState().refreshContact('1');
    const { contacts } = useAppStore.getState();
    expect(contacts.find(c => c.contactId === '1')?.name).toBe('Alice Updated');
  });
});

describe('Store - updateSetting', () => {
  it('updates a setting in store', async () => {
    await useAppStore.getState().updateSetting('theme', 'dark');
    const { settings } = useAppStore.getState();
    expect(settings.theme).toBe('dark');
  });
});

describe('Store - notification settings', () => {
  it('updates notification setting for a contact', async () => {
    await useAppStore.getState().updateNotificationSetting({
      contactId: 'c1',
      enabled: true,
      offsets: [0, 7],
      time: '08:30',
    });
    const ns = useAppStore.getState().notificationSettings.get('c1');
    expect(ns).toBeDefined();
    expect(ns!.offsets).toEqual([0, 7]);
  });

  it('deletes notification setting for a contact', async () => {
    useAppStore.setState({
      notificationSettings: new Map([['c1', { contactId: 'c1', enabled: true, offsets: [0], time: '09:00' }]]),
    });
    await useAppStore.getState().deleteNotificationSetting('c1');
    expect(useAppStore.getState().notificationSettings.has('c1')).toBe(false);
  });
});
