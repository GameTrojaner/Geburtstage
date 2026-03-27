import * as Contacts from 'expo-contacts';
import {
  saveBirthdayToContact,
  removeBirthdayFromContact,
  createContactWithBirthday,
  openNativeContactEditor,
  openNativeEditorAndReloadContact,
  shouldUseNativeEditorForContact,
} from '../src/services/contacts';

// Mock expo-contacts
jest.mock('expo-contacts', () => ({
  Fields: {
    Birthday: 'birthday',
    Dates: 'dates',
    FirstName: 'firstName',
    LastName: 'lastName',
    Name: 'name',
    Image: 'image',
    RawImage: 'rawImage',
    ImageAvailable: 'imageAvailable',
    ContactTypes: { Person: 'person' },
    SortTypes: { LastName: 'lastName' },
  },
  ContactTypes: { Person: 'person' },
  SortTypes: { LastName: 'lastName' },
  getContactsAsync: jest.fn(),
  getContactByIdAsync: jest.fn(),
  updateContactAsync: jest.fn(),
  addContactAsync: jest.fn(),
  presentFormAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
}));

describe('Contact Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveBirthdayToContact', () => {
    it('should save birthday with non-birthday dates array to prevent duplicates', async () => {
      const mockContact = {
        id: 'contact-1',
        name: 'John Doe',
        birthday: { day: 15, month: 5, year: 1990 },
        dates: [{ day: 1, month: 5, label: 'anniversary' }],
      };

      (Contacts.getContactByIdAsync as jest.Mock).mockResolvedValue(mockContact);
      (Contacts.updateContactAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await saveBirthdayToContact('contact-1', {
        day: 27,
        month: 3,
        year: 2026,
      });

      expect(result).toBe(true);
      expect(Contacts.updateContactAsync).toHaveBeenCalledWith({
        id: 'contact-1',
        birthday: {
          day: 27,
          month: 2, // 0-indexed
          year: 2026,
        },
        dates: [{ day: 1, month: 5, label: 'anniversary' }],
      });
    });

    it('should handle birthday without year', async () => {
      const mockContact = {
        id: 'contact-2',
        name: 'Jane Doe',
        dates: [],
      };

      (Contacts.getContactByIdAsync as jest.Mock).mockResolvedValue(mockContact);
      (Contacts.updateContactAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await saveBirthdayToContact('contact-2', {
        day: 15,
        month: 5,
      });

      expect(result).toBe(true);
      expect(Contacts.updateContactAsync).toHaveBeenCalledWith({
        id: 'contact-2',
        birthday: {
          day: 15,
          month: 4, // 0-indexed
        },
        dates: [],
      });
    });

    it('should fallback if updateContactAsync fails on first attempt', async () => {
      const mockContact = {
        id: 'contact-3',
        name: 'Bob Smith',
        dates: [],
      };

      (Contacts.getContactByIdAsync as jest.Mock).mockResolvedValue(mockContact);
      (Contacts.updateContactAsync as jest.Mock)
        .mockRejectedValueOnce(new Error('Insert failed'))
        .mockResolvedValueOnce(undefined);

      const result = await saveBirthdayToContact('contact-3', {
        day: 10,
        month: 12,
        year: 1995,
      });

      expect(result).toBe(true);
      // First call with dates array
      expect(Contacts.updateContactAsync).toHaveBeenNthCalledWith(1, {
        id: 'contact-3',
        birthday: {
          day: 10,
          month: 11,
          year: 1995,
        },
        dates: [],
      });
      // Second call fallback without dates array
      expect(Contacts.updateContactAsync).toHaveBeenNthCalledWith(2, {
        id: 'contact-3',
        birthday: {
          day: 10,
          month: 11,
          year: 1995,
        },
      });
    });

    it('should return false if fallback also fails', async () => {
      const mockContact = {
        id: 'contact-4',
        name: 'Alice Brown',
        dates: [],
      };

      (Contacts.getContactByIdAsync as jest.Mock).mockResolvedValue(mockContact);
      (Contacts.updateContactAsync as jest.Mock).mockRejectedValue(
        new Error('Persistent failure')
      );

      const result = await saveBirthdayToContact('contact-4', {
        day: 5,
        month: 1,
      });

      expect(result).toBe(false);
      expect(Contacts.updateContactAsync).toHaveBeenCalledTimes(3);
    });

    it('should use compatibility fallback with non-converted month as last attempt', async () => {
      const mockContact = {
        id: 'contact-compat',
        name: 'Compat Contact',
        dates: [],
      };

      (Contacts.getContactByIdAsync as jest.Mock).mockResolvedValue(mockContact);
      (Contacts.updateContactAsync as jest.Mock)
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockRejectedValueOnce(new Error('Attempt 2 failed'))
        .mockRejectedValueOnce(new Error('Attempt 3 failed'))
        .mockResolvedValueOnce(undefined);

      const result = await saveBirthdayToContact('contact-compat', {
        day: 25,
        month: 5,
        year: 1960,
      });

      expect(result).toBe(true);
      expect(Contacts.updateContactAsync).toHaveBeenNthCalledWith(4, {
        id: 'contact-compat',
        birthday: {
          day: 25,
          month: 5,
          year: 1960,
        },
      });
    });

    it('should fallback to saving without year when provider rejects year-based birthday', async () => {
      const mockContact = {
        id: 'contact-yearless',
        name: 'Yearless Contact',
        dates: [],
      };

      (Contacts.getContactByIdAsync as jest.Mock).mockResolvedValue(mockContact);
      (Contacts.updateContactAsync as jest.Mock)
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockRejectedValueOnce(new Error('Attempt 2 failed'))
        .mockResolvedValueOnce(undefined);

      const result = await saveBirthdayToContact('contact-yearless', {
        day: 12,
        month: 8,
        year: 1984,
      });

      expect(result).toBe(true);
      expect(Contacts.updateContactAsync).toHaveBeenNthCalledWith(3, {
        id: 'contact-yearless',
        birthday: {
          day: 12,
          month: 7,
        },
      });
    });

    it('should mark contact for native-editor-only mode when all write attempts fail', async () => {
      const mockContact = {
        id: 'contact-fail-mark',
        name: 'Fail Mark',
        dates: [],
      };

      (Contacts.getContactByIdAsync as jest.Mock).mockResolvedValue(mockContact);
      (Contacts.updateContactAsync as jest.Mock).mockRejectedValue(new Error('Always fail'));

      const result = await saveBirthdayToContact('contact-fail-mark', {
        day: 1,
        month: 2,
        year: 1990,
      });

      expect(result).toBe(false);
      expect(shouldUseNativeEditorForContact('contact-fail-mark')).toBe(true);
    });

    it('should clear native-editor-only marker after a later successful save', async () => {
      const mockContact = {
        id: 'contact-fail-mark',
        name: 'Fail Mark',
        dates: [],
      };

      (Contacts.getContactByIdAsync as jest.Mock).mockResolvedValue(mockContact);
      (Contacts.updateContactAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await saveBirthdayToContact('contact-fail-mark', {
        day: 2,
        month: 2,
      });

      expect(result).toBe(true);
      expect(shouldUseNativeEditorForContact('contact-fail-mark')).toBe(false);
    });

    it('should strip birthday-labeled entries from dates payload', async () => {
      const mockContact = {
        id: 'contact-filter',
        name: 'Filter Contact',
        dates: [
          { day: 1, month: 1, label: 'birthday' },
          { day: 2, month: 2, label: 'BIRTHDAY' },
          { day: 3, month: 3, label: 'anniversary' },
        ],
      };

      (Contacts.getContactByIdAsync as jest.Mock).mockResolvedValue(mockContact);
      (Contacts.updateContactAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await saveBirthdayToContact('contact-filter', {
        day: 11,
        month: 6,
      });

      expect(result).toBe(true);
      expect(Contacts.updateContactAsync).toHaveBeenCalledWith({
        id: 'contact-filter',
        birthday: {
          day: 11,
          month: 5,
        },
        dates: [{ day: 3, month: 3, label: 'anniversary' }],
      });
    });

    it('should return false if contact not found', async () => {
      (Contacts.getContactByIdAsync as jest.Mock).mockResolvedValue(null);

      const result = await saveBirthdayToContact('nonexistent', {
        day: 15,
        month: 6,
      });

      expect(result).toBe(false);
      expect(Contacts.updateContactAsync).not.toHaveBeenCalled();
    });
  });

  describe('removeBirthdayFromContact', () => {
    it('should remove birthday by passing only non-birthday dates', async () => {
      const mockContact = {
        id: 'contact-5',
        name: 'Charlie Davis',
        birthday: { day: 20, month: 7 },
        dates: [{ day: 1, month: 5, label: 'anniversary' }],
      };

      (Contacts.getContactByIdAsync as jest.Mock).mockResolvedValue(mockContact);
      (Contacts.updateContactAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await removeBirthdayFromContact('contact-5');

      expect(result).toBe(true);
      expect(Contacts.updateContactAsync).toHaveBeenCalledWith({
        id: 'contact-5',
        dates: [{ day: 1, month: 5, label: 'anniversary' }],
      });
    });

    it('should handle contact with no existing dates', async () => {
      const mockContact = {
        id: 'contact-6',
        name: 'Eve Wilson',
        birthday: { day: 14, month: 2 },
      };

      (Contacts.getContactByIdAsync as jest.Mock).mockResolvedValue(mockContact);
      (Contacts.updateContactAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await removeBirthdayFromContact('contact-6');

      expect(result).toBe(true);
      expect(Contacts.updateContactAsync).toHaveBeenCalledWith({
        id: 'contact-6',
        dates: [],
      });
    });

    it('should return false if contact not found', async () => {
      (Contacts.getContactByIdAsync as jest.Mock).mockResolvedValue(null);

      const result = await removeBirthdayFromContact('nonexistent');

      expect(result).toBe(false);
    });

    it('should return false if updateContactAsync fails', async () => {
      const mockContact = {
        id: 'contact-7',
        name: 'Frank Miller',
        dates: [],
      };

      (Contacts.getContactByIdAsync as jest.Mock).mockResolvedValue(mockContact);
      (Contacts.updateContactAsync as jest.Mock).mockRejectedValue(
        new Error('Update failed')
      );

      const result = await removeBirthdayFromContact('contact-7');

      expect(result).toBe(false);
    });
  });

  describe('createContactWithBirthday', () => {
    it('should create contact with birthday and year', async () => {
      (Contacts.addContactAsync as jest.Mock).mockResolvedValue('new-contact-1');

      const result = await createContactWithBirthday('Max Mustermann', {
        day: 3,
        month: 9,
        year: 2000,
      });

      expect(result).toBe('new-contact-1');
      expect(Contacts.addContactAsync).toHaveBeenCalledWith({
        contactType: 'person',
        firstName: 'Max',
        lastName: 'Mustermann',
        name: 'Max Mustermann',
        birthday: {
          day: 3,
          month: 8, // 0-indexed
          year: 2000,
        },
      });
    });

    it('should create contact with birthday without year', async () => {
      (Contacts.addContactAsync as jest.Mock).mockResolvedValue('new-contact-2');

      const result = await createContactWithBirthday('Single Name', {
        day: 15,
        month: 5,
      });

      expect(result).toBe('new-contact-2');
      expect(Contacts.addContactAsync).toHaveBeenCalledWith({
        contactType: 'person',
        firstName: 'Single',
        lastName: 'Name',
        name: 'Single Name',
        birthday: {
          day: 15,
          month: 4,
        },
      });
    });

    it('should handle single word name', async () => {
      (Contacts.addContactAsync as jest.Mock).mockResolvedValue('new-contact-3');

      const result = await createContactWithBirthday('Madonna', {
        day: 8,
        month: 8,
        year: 1958,
      });

      expect(result).toBe('new-contact-3');
      expect(Contacts.addContactAsync).toHaveBeenCalledWith({
        contactType: 'person',
        firstName: 'Madonna',
        lastName: undefined,
        name: 'Madonna',
        birthday: {
          day: 8,
          month: 7,
          year: 1958,
        },
      });
    });

    it('should return null if creation fails', async () => {
      (Contacts.addContactAsync as jest.Mock).mockRejectedValue(
        new Error('Creation failed')
      );

      const result = await createContactWithBirthday('Test Person', {
        day: 1,
        month: 1,
      });

      expect(result).toBeNull();
    });
  });

  describe('openNativeContactEditor', () => {
    it('should open native editor successfully', async () => {
      (Contacts.presentFormAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await openNativeContactEditor('contact-native-1');

      expect(result).toBe(true);
      expect(Contacts.presentFormAsync).toHaveBeenCalledWith('contact-native-1');
    });

    it('should return false when native editor cannot be opened', async () => {
      (Contacts.presentFormAsync as jest.Mock).mockRejectedValue(new Error('Open failed'));

      const result = await openNativeContactEditor('contact-native-2');

      expect(result).toBe(false);
      expect(Contacts.presentFormAsync).toHaveBeenCalledWith('contact-native-2');
    });

    it('should reopen and return refreshed contact data after native edit', async () => {
      (Contacts.presentFormAsync as jest.Mock).mockResolvedValue(undefined);
      (Contacts.getContactByIdAsync as jest.Mock).mockResolvedValue({
        id: 'contact-native-3',
        name: 'Native Updated',
        firstName: 'Native',
        lastName: 'Updated',
        imageAvailable: false,
        birthday: { day: 14, month: 1, year: 1990 }, // native 0-indexed month
      });

      const result = await openNativeEditorAndReloadContact('contact-native-3');

      expect(Contacts.presentFormAsync).toHaveBeenCalledWith('contact-native-3');
      expect(Contacts.getContactByIdAsync).toHaveBeenCalled();
      expect(result).toEqual({
        contactId: 'contact-native-3',
        name: 'Native Updated',
        firstName: 'Native',
        lastName: 'Updated',
        imageUri: undefined,
        rawImageUri: undefined,
        imageBase64: undefined,
        birthday: { day: 14, month: 2, year: 1990 },
      });
    });

    it('should return null and skip reload when native editor fails to open', async () => {
      (Contacts.presentFormAsync as jest.Mock).mockRejectedValue(new Error('Open failed'));

      const result = await openNativeEditorAndReloadContact('contact-native-4');

      expect(result).toBeNull();
      expect(Contacts.getContactByIdAsync).not.toHaveBeenCalled();
    });
  });
});
