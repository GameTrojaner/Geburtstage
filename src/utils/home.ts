import { ContactBirthday } from '../types';

export type HomeFilter = 'all' | 'favorites';

export function filterHomeContacts(
  contacts: ContactBirthday[],
  favorites: Set<string>,
  filter: HomeFilter
): ContactBirthday[] {
  if (filter === 'favorites') {
    return contacts.filter(contact => favorites.has(contact.contactId));
  }
  return contacts;
}
