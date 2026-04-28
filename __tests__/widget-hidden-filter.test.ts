import React from 'react';

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

jest.mock('expo-contacts', () => ({
  Fields: {
    Name: 'name',
    Birthday: 'birthday',
    Image: 'image',
    RawImage: 'rawImage',
    ImageAvailable: 'imageAvailable',
  },
  getContactsAsync: jest.fn(),
  getContactByIdAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  File: class {
    base64() { return Promise.reject(new Error('no file')); }
  },
}));

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn().mockRejectedValue(new Error('no file')),
  EncodingType: { Base64: 'base64' },
}));

jest.mock('../src/services/contacts', () => ({
  checkContactsPermission: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/services/database', () => ({
  getFavorites: jest.fn().mockResolvedValue([]),
  getHidden: jest.fn().mockResolvedValue([]),
}));

jest.mock('../src/services/photoCache', () => ({
  getCachedPhotoUri: jest.fn().mockResolvedValue(null),
}));

jest.mock('../src/widget/preferences', () => ({
  resolveWidgetPreferences: jest.fn().mockResolvedValue({ isDark: false, maxEntries: 10 }),
}));

jest.mock('../src/widget/BirthdayWidget', () => ({
  BirthdayWidget: jest.fn().mockReturnValue(null),
}));

import * as Contacts from 'expo-contacts';
import { getFavorites, getHidden } from '../src/services/database';
import { renderWidgetForName } from '../src/widget/widgetTaskHandler';

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const VISIBLE_CONTACT = {
  id: 'visible1',
  name: 'Alice',
  birthday: { day: tomorrow.getDate(), month: tomorrow.getMonth(), year: 1990 },
};

const HIDDEN_CONTACT = {
  id: 'hidden1',
  name: 'Bob',
  birthday: { day: tomorrow.getDate(), month: tomorrow.getMonth(), year: 1985 },
};

function getBirthdayIds(element: React.ReactElement): string[] {
  const birthdays = (element.props as { birthdays: { contactId: string }[] }).birthdays;
  return birthdays.map(b => b.contactId);
}

describe('widgetTaskHandler hidden contact filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Contacts.getContactsAsync as jest.Mock).mockResolvedValue({
      data: [VISIBLE_CONTACT, HIDDEN_CONTACT],
    });
    (Contacts.getContactByIdAsync as jest.Mock).mockResolvedValue(null);
  });

  it('calls getHidden once per widget render', async () => {
    (getHidden as jest.Mock).mockResolvedValue(['hidden1']);
    (getFavorites as jest.Mock).mockResolvedValue([]);

    await renderWidgetForName('BirthdayUpcoming');

    expect(getHidden).toHaveBeenCalledTimes(1);
  });

  it('excludes hidden contacts from the birthdays passed to BirthdayWidget', async () => {
    (getHidden as jest.Mock).mockResolvedValue(['hidden1']);
    (getFavorites as jest.Mock).mockResolvedValue([]);

    const element = await renderWidgetForName('BirthdayUpcoming') as React.ReactElement;
    const ids = getBirthdayIds(element);

    expect(ids).toContain('visible1');
    expect(ids).not.toContain('hidden1');
  });

  it('shows all contacts when getHidden returns empty list', async () => {
    (getHidden as jest.Mock).mockResolvedValue([]);
    (getFavorites as jest.Mock).mockResolvedValue([]);

    const element = await renderWidgetForName('BirthdayUpcoming') as React.ReactElement;
    const ids = getBirthdayIds(element);

    expect(ids).toContain('visible1');
    expect(ids).toContain('hidden1');
  });

  it('shows all contacts (no hidden filter) when getHidden throws', async () => {
    (getHidden as jest.Mock).mockRejectedValue(new Error('db error'));
    (getFavorites as jest.Mock).mockResolvedValue([]);

    const element = await renderWidgetForName('BirthdayUpcoming') as React.ReactElement;
    const ids = getBirthdayIds(element);

    expect(ids).toContain('visible1');
    expect(ids).toContain('hidden1');
  });
});
