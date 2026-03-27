import * as Contacts from 'expo-contacts';
import { ContactBirthday } from '../types';

const contactsNeedingNativeEditor = new Set<string>();
type ContactUpdatePayload = { id: string } & Partial<Contacts.ExistingContact>;

export function shouldUseNativeEditorForContact(contactId: string): boolean {
  return contactsNeedingNativeEditor.has(contactId);
}

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
    imageUri: contact.image?.uri ?? undefined,
    rawImageUri: contact.rawImage?.uri ?? undefined,
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
    imageUri: contact.image?.uri ?? undefined,
    rawImageUri: contact.rawImage?.uri ?? undefined,
    imageBase64: contact.rawImage?.base64 || contact.image?.base64 || undefined,
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
    // Fetch only birthday + dates to separate existing birthday from other date events
    const contact = await Contacts.getContactByIdAsync(contactId, [
      Contacts.Fields.Birthday,
      Contacts.Fields.Dates,
    ]);
    if (!contact) return false;

    // Defensive filter: in some provider/device combinations `dates` can still contain
    // birthday-like entries. Keeping those would re-introduce duplicate birthday inserts.
    const nonBirthdayDates = (contact.dates ?? []).filter(
      d => String(d.label ?? '').toLowerCase() !== 'birthday'
    );

    const buildBirthday = (nativeMonth: number) => ({
      day: birthday.day,
      month: nativeMonth,
      ...(birthday.year !== undefined ? { year: birthday.year } : {}),
    });

    const nativeMonth = birthday.month - 1; // expo-contacts month is 0-indexed
    console.log(
      'Saving birthday (UI month is 1-based, native month is 0-based):',
      JSON.stringify(
        {
          inputBirthday: birthday,
          nativeBirthday: buildBirthday(nativeMonth),
          nonBirthdayDatesCount: nonBirthdayDates.length,
        },
        null,
        2
      )
    );

    await Contacts.updateContactAsync({
      id: contactId,
      birthday: buildBirthday(nativeMonth),
      dates: nonBirthdayDates,
    } as ContactUpdatePayload);
    contactsNeedingNativeEditor.delete(contactId);
    return true;
  } catch (error) {
    console.error('Error saving birthday to contact (attempt 1):', error);

    // Fallback 1: Try again with minimal payload (birthday only, no dates)
    try {
      console.log('Attempting fallback: saving birthday without explicit dates array');
      await Contacts.updateContactAsync({
        id: contactId,
        birthday: {
          day: birthday.day,
          month: birthday.month - 1,
          ...(birthday.year !== undefined ? { year: birthday.year } : {}),
        },
      } as ContactUpdatePayload);
      console.log('Fallback attempt succeeded');
      contactsNeedingNativeEditor.delete(contactId);
      return true;
    } catch (fallbackError) {
      console.error('Error saving birthday to contact (fallback attempt):', fallbackError);

      // Fallback 2: Some providers reject birthdays with year. Retry without year when present.
      if (birthday.year !== undefined) {
        try {
          console.log('Attempting fallback: saving birthday without year');
          await Contacts.updateContactAsync({
            id: contactId,
            birthday: {
              day: birthday.day,
              month: birthday.month - 1,
            },
          } as ContactUpdatePayload);
          console.log('Yearless fallback succeeded');
          contactsNeedingNativeEditor.delete(contactId);
          return true;
        } catch (yearlessError) {
          console.error('Error saving birthday to contact (yearless fallback):', yearlessError);
        }
      }

      // Fallback 3 (compatibility): some provider stacks appear to expect month as-is.
      // We only try this as last resort to avoid hard failure on vendor-specific behavior.
      try {
        console.log('Attempting compatibility fallback: saving birthday with non-converted month');
        await Contacts.updateContactAsync({
          id: contactId,
          birthday: {
            day: birthday.day,
            month: birthday.month,
            ...(birthday.year !== undefined ? { year: birthday.year } : {}),
          },
        } as ContactUpdatePayload);
        console.log('Compatibility fallback succeeded');
        contactsNeedingNativeEditor.delete(contactId);
        return true;
      } catch (compatError) {
        console.error('Error saving birthday to contact (compatibility fallback):', compatError);
        contactsNeedingNativeEditor.add(contactId);
        return false;
      }
    }
  }
}

export async function removeBirthdayFromContact(contactId: string): Promise<boolean> {
  try {
    const contact = await Contacts.getContactByIdAsync(contactId, [
      Contacts.Fields.Birthday,
      Contacts.Fields.Dates,
    ]);
    if (!contact) return false;

    // Pass only the non-birthday dates; omitting the birthday key means
    // mutateContact won't re-add it, effectively removing the birthday.
    await Contacts.updateContactAsync({
      id: contactId,
      dates: contact.dates ?? [],
    } as ContactUpdatePayload);
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
    // Expected on some providers/devices; caller falls back to native contact editor.
    console.warn('Direct contact creation failed, will use native editor fallback:', error);
    return null;
  }
}

export async function openNativeCreateContact(
  name: string,
  birthday?: { day: number; month: number; year?: number }
): Promise<boolean> {
  try {
    const trimmedName = name.trim();
    const parts = trimmedName.split(/\s+/).filter(Boolean);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || undefined;

    const prefilledContact: Contacts.Contact = {
      contactType: Contacts.ContactTypes.Person,
      firstName,
      lastName,
      name: trimmedName,
      ...(birthday
        ? {
            birthday: {
              day: birthday.day,
              month: birthday.month - 1,
              ...(birthday.year !== undefined ? { year: birthday.year } : {}),
            },
          }
        : {}),
    };

    await Contacts.presentFormAsync(undefined, prefilledContact, { isNew: true });
    return true;
  } catch (error) {
    console.error('Error opening native create contact form:', error);
    return false;
  }
}

export async function openNativeContactEditor(contactId: string): Promise<boolean> {
  try {
    await Contacts.presentFormAsync(contactId);
    return true;
  } catch (error) {
    console.error('Error opening native contact editor:', error);
    return false;
  }
}

export async function openNativeEditorAndReloadContact(
  contactId: string
): Promise<ContactBirthday | null> {
  const opened = await openNativeContactEditor(contactId);
  if (!opened) return null;

  return getContactById(contactId);
}
