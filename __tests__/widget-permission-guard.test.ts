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
  checkContactsPermission: jest.fn(),
}));

jest.mock('../src/services/database', () => ({
  getFavorites: jest.fn().mockResolvedValue([]),
}));

jest.mock('../src/services/photoCache', () => ({
  getCachedPhotoUri: jest.fn().mockResolvedValue(null),
}));

jest.mock('../src/widget/preferences', () => ({
  resolveWidgetPreferences: jest.fn().mockResolvedValue({ isDark: false, maxEntries: 5 }),
}));

jest.mock('../src/widget/BirthdayWidget', () => ({
  BirthdayWidget: () => null,
}));

import * as Contacts from 'expo-contacts';
import { checkContactsPermission } from '../src/services/contacts';
import { renderWidgetForName } from '../src/widget/widgetTaskHandler';

describe('widgetTaskHandler permission guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips getContactsAsync and returns empty lists when contacts permission is denied', async () => {
    (checkContactsPermission as jest.Mock).mockResolvedValue(false);

    await renderWidgetForName('BirthdayUpcoming');

    expect(Contacts.getContactsAsync).not.toHaveBeenCalled();
  });

  it('calls getContactsAsync when contacts permission is granted', async () => {
    (checkContactsPermission as jest.Mock).mockResolvedValue(true);
    (Contacts.getContactsAsync as jest.Mock).mockResolvedValue({ data: [] });

    await renderWidgetForName('BirthdayUpcoming');

    expect(Contacts.getContactsAsync).toHaveBeenCalledTimes(1);
  });
});
