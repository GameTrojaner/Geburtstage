import * as Contacts from 'expo-contacts';
import { ContactBirthday } from '../types';

export async function requestContactsPermission(): Promise<boolean> {
  const { status } = await Contacts.requestPermissionsAsync();
  return status === 'granted';
}

export async function checkContactsPermission(): Promise<boolean> {
  const { status } = await Contacts.getPermissionsAsync();
  return status === 'granted';
}

export async function getAllContacts(): Promise<ContactBirthday[]> {
  const { data } = await Contacts.getContactsAsync({
    fields: [
      Contacts.Fields.FirstName,
      Contacts.Fields.LastName,
      Contacts.Fields.Name,
      Contacts.Fields.Birthday,
      Contacts.Fields.Image,
      Contacts.Fields.RawImage,
      Contacts.Fields.ImageAvailable,
    ],
    sort: Contacts.SortTypes.LastName,
  });

  return data.map(contact => ({
    contactId: contact.id!,
    name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown',
    firstName: contact.firstName ?? undefined,
    lastName: contact.lastName ?? undefined,
    imageUri: contact.imageAvailable && contact.image ? contact.image.uri : undefined,
    rawImageUri: contact.imageAvailable && contact.rawImage ? contact.rawImage.uri : undefined,
    birthday: contact.birthday
      ? {
          day: contact.birthday.day!,
          month: (contact.birthday.month ?? 0) + 1, // expo-contacts months are 0-indexed
          year: contact.birthday.year ?? undefined,
        }
      : undefined,
  }));
}

export async function getContactById(contactId: string): Promise<ContactBirthday | null> {
  const contact = await Contacts.getContactByIdAsync(contactId, [
    Contacts.Fields.FirstName,
    Contacts.Fields.LastName,
    Contacts.Fields.Name,
    Contacts.Fields.Birthday,
    Contacts.Fields.Image,
    Contacts.Fields.RawImage,
    Contacts.Fields.ImageAvailable,
  ]);

  if (!contact) return null;

  return {
    contactId: contact.id!,
    name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown',
    firstName: contact.firstName ?? undefined,
    lastName: contact.lastName ?? undefined,
    imageUri: contact.imageAvailable && contact.image ? contact.image.uri : undefined,
    rawImageUri: contact.imageAvailable && contact.rawImage ? contact.rawImage.uri : undefined,
    imageBase64: contact.imageAvailable
      ? (contact.rawImage?.base64 || contact.image?.base64 || undefined)
      : undefined,
    birthday: contact.birthday
      ? {
          day: contact.birthday.day!,
          month: (contact.birthday.month ?? 0) + 1,
          year: contact.birthday.year ?? undefined,
        }
      : undefined,
  };
}

export async function saveBirthdayToContact(
  contactId: string,
  birthday: { day: number; month: number; year?: number }
): Promise<boolean> {
  try {
    const contact = await Contacts.getContactByIdAsync(contactId);
    if (!contact) return false;

    contact.birthday = {
      day: birthday.day,
      month: birthday.month - 1, // expo-contacts months are 0-indexed
      year: birthday.year,
    };

    await Contacts.updateContactAsync(contact);
    return true;
  } catch (error) {
    console.error('Error saving birthday to contact:', error);
    return false;
  }
}

export async function removeBirthdayFromContact(contactId: string): Promise<boolean> {
  try {
    const contact = await Contacts.getContactByIdAsync(contactId);
    if (!contact) return false;

    contact.birthday = undefined;
    await Contacts.updateContactAsync(contact);
    return true;
  } catch (error) {
    console.error('Error removing birthday from contact:', error);
    return false;
  }
}

export async function createContactWithBirthday(
  name: string,
  birthday: { day: number; month: number; year?: number }
): Promise<string | null> {
  try {
    const parts = name.trim().split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || undefined;

    const contact: Contacts.Contact = {
      contactType: Contacts.ContactTypes.Person,
      firstName,
      lastName,
      name: name.trim(),
      birthday: {
        day: birthday.day,
        month: birthday.month - 1,
        year: birthday.year,
      },
    };

    const contactId = await Contacts.addContactAsync(contact);
    return contactId;
  } catch (error) {
    console.error('Error creating contact:', error);
    return null;
  }
}
