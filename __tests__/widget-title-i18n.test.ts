/**
 * Tests that renderWidgetForName uses the app language setting to set the
 * widget title, not hardcoded German strings.
 *
 * renderWidgetForName returns a React element; we inspect its props directly
 * (no DOM/renderer required) to verify the correct title is passed.
 */
import React from 'react';

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

jest.mock('expo-contacts', () => ({
  Fields: {
    Name: 'name', Birthday: 'birthday', Image: 'image',
    RawImage: 'rawImage', ImageAvailable: 'imageAvailable',
  },
  getContactsAsync: jest.fn().mockResolvedValue({ data: [] }),
  getContactByIdAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  File: class { base64() { return Promise.reject(new Error('no file')); } },
}));
jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn().mockRejectedValue(new Error('no file')),
  EncodingType: { Base64: 'base64' },
}));

jest.mock('../src/services/contacts', () => ({
  checkContactsPermission: jest.fn().mockResolvedValue(false),
}));

jest.mock('../src/services/photoCache', () => ({
  getCachedPhotoUri: jest.fn().mockResolvedValue(null),
}));

jest.mock('../src/widget/preferences', () => ({
  resolveWidgetPreferences: jest.fn().mockResolvedValue({ isDark: false, maxEntries: 5 }),
}));

// Use a string tag so the element is a plain React element with inspectable props.
jest.mock('../src/widget/BirthdayWidget', () => ({
  BirthdayWidget: 'BirthdayWidget',
}));

const mockGetSettings = jest.fn();
jest.mock('../src/services/database', () => ({
  getFavorites: jest.fn().mockResolvedValue([]),
  getSettings: (...args: unknown[]) => mockGetSettings(...args),
}));

import { DEFAULT_SETTINGS } from '../src/types';
import { renderWidgetForName } from '../src/widget/widgetTaskHandler';

type WidgetElement = React.ReactElement<{ title: string }>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('widget title i18n', () => {
  it('uses German upcoming title when language is "de"', async () => {
    mockGetSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, language: 'de' });

    const el = (await renderWidgetForName('BirthdayUpcoming')) as WidgetElement;

    expect(React.isValidElement(el)).toBe(true);
    expect(el.props.title).toBe('Nächste Geburtstage');
  });

  it('uses German favorites title when language is "de"', async () => {
    mockGetSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, language: 'de' });

    const el = (await renderWidgetForName('BirthdayFavorites')) as WidgetElement;

    expect(el.props.title).toBe('Favoriten');
  });

  it('uses English upcoming title when language is "en"', async () => {
    mockGetSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, language: 'en' });

    const el = (await renderWidgetForName('BirthdayUpcoming')) as WidgetElement;

    expect(el.props.title).toBe('Upcoming Birthdays');
  });

  it('uses English favorites title when language is "en"', async () => {
    mockGetSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, language: 'en' });

    const el = (await renderWidgetForName('BirthdayFavorites')) as WidgetElement;

    expect(el.props.title).toBe('Favourites');
  });

  it('falls back gracefully when getSettings rejects', async () => {
    mockGetSettings.mockRejectedValue(new Error('db error'));

    const el = (await renderWidgetForName('BirthdayUpcoming')) as WidgetElement;

    expect(React.isValidElement(el)).toBe(true);
    expect(typeof el.props.title).toBe('string');
  });
});
