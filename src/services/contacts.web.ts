/**
 * Web stub for contacts service.
 * Contacts API is not available on web.
 */
import { ContactBirthday } from '../types';

export async function requestContactsPermission(): Promise<boolean> {
  return false;
}

export async function checkContactsPermission(): Promise<boolean> {
  return false;
}

export async function getAllContacts(): Promise<ContactBirthday[]> {
  return [];
}

export async function getContactById(_contactId: string): Promise<ContactBirthday | null> {
  return null;
}

export async function saveBirthdayToContact(
  _contactId: string,
  _birthday: { day: number; month: number; year?: number }
): Promise<void> {
  console.warn('Contacts API not available on web');
}

export async function removeBirthdayFromContact(_contactId: string): Promise<void> {
  console.warn('Contacts API not available on web');
}
