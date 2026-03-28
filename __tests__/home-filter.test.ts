import { filterHomeContacts } from '../src/utils/home';
import type { ContactBirthday } from '../src/types';

describe('filterHomeContacts', () => {
  const contacts: ContactBirthday[] = [
    { contactId: 'a', name: 'Anna' },
    { contactId: 'b', name: 'Ben' },
    { contactId: 'c', name: 'Chris' },
  ];

  it('returns all contacts for all filter', () => {
    const result = filterHomeContacts(contacts, new Set(['a']), 'all');

    expect(result.map(c => c.contactId)).toEqual(['a', 'b', 'c']);
  });

  it('returns only favorites for favorites filter', () => {
    const result = filterHomeContacts(contacts, new Set(['a', 'c']), 'favorites');

    expect(result.map(c => c.contactId)).toEqual(['a', 'c']);
  });

  it('returns empty list when no favorites are present', () => {
    const result = filterHomeContacts(contacts, new Set(), 'favorites');

    expect(result).toEqual([]);
  });
});
