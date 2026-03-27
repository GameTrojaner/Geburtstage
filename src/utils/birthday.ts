import { ContactBirthday } from '../types';

export function getDaysUntilBirthday(birthday: { day: number; month: number }): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), birthday.month - 1, birthday.day);

  if (next < today) {
    next = new Date(now.getFullYear() + 1, birthday.month - 1, birthday.day);
  }

  const diff = next.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getAge(birthday: { day: number; month: number; year?: number }): number | undefined {
  if (!birthday.year) return undefined;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let nextBday = new Date(now.getFullYear(), birthday.month - 1, birthday.day);

  if (nextBday < today) {
    nextBday = new Date(now.getFullYear() + 1, birthday.month - 1, birthday.day);
  }

  return nextBday.getFullYear() - birthday.year;
}

export function getUpcomingAge(birthday: { day: number; month: number; year?: number }): number | undefined {
  if (!birthday.year) return undefined;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let nextBday = new Date(now.getFullYear(), birthday.month - 1, birthday.day);

  if (nextBday < today) {
    nextBday = new Date(now.getFullYear() + 1, birthday.month - 1, birthday.day);
  }

  return nextBday.getFullYear() - birthday.year;
}

export function formatBirthday(birthday: { day: number; month: number; year?: number }): string {
  const day = String(birthday.day).padStart(2, '0');
  const month = String(birthday.month).padStart(2, '0');
  if (birthday.year) {
    return `${day}.${month}.${birthday.year}`;
  }
  return `${day}.${month}.`;
}

export function formatBirthdayISO(birthday: { day: number; month: number; year?: number }, forYear?: number): string {
  const year = forYear ?? new Date().getFullYear();
  const month = String(birthday.month).padStart(2, '0');
  const day = String(birthday.day).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type BirthdayGroup = 'pinned' | 'today' | 'thisWeek' | 'thisMonth' | 'nextMonth' | 'later' | 'passed';

function hasBirthdayPassed(birthday: { day: number; month: number }): boolean {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisYear = new Date(now.getFullYear(), birthday.month - 1, birthday.day);
  return thisYear < today;
}

export function groupBirthdayContacts(
  contacts: ContactBirthday[],
  pinnedIds: Set<string>,
): Record<BirthdayGroup, ContactBirthday[]> {
  const groups: Record<BirthdayGroup, ContactBirthday[]> = {
    pinned: [],
    today: [],
    thisWeek: [],
    thisMonth: [],
    nextMonth: [],
    later: [],
    passed: [],
  };

  const withBirthday = contacts
    .filter(c => c.birthday)
    .sort((a, b) => getDaysUntilBirthday(a.birthday!) - getDaysUntilBirthday(b.birthday!));

  const now = new Date();
  const currentMonth = now.getMonth();
  const nextMonthIndex = (currentMonth + 1) % 12;

  for (const contact of withBirthday) {
    if (!contact.birthday) continue;

    if (pinnedIds.has(contact.contactId)) {
      groups.pinned.push(contact);
    }

    const days = getDaysUntilBirthday(contact.birthday);

    if (days === 0) {
      groups.today.push(contact);
    } else if (hasBirthdayPassed(contact.birthday)) {
      groups.passed.push(contact);
    } else if (days <= 7) {
      groups.thisWeek.push(contact);
    } else if (contact.birthday.month - 1 === currentMonth) {
      groups.thisMonth.push(contact);
    } else if (contact.birthday.month - 1 === nextMonthIndex) {
      groups.nextMonth.push(contact);
    } else {
      groups.later.push(contact);
    }
  }

  return groups;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (name[0] || '?').toUpperCase();
}

export function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export function getOffsetLabel(offset: number, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (offset === 0) return t('settings.offsetSameDay');
  if (offset % 30 === 0) {
    const months = offset / 30;
    if (months === 1) return t('settings.offsetMonthBefore');
    return t('settings.offsetMonthsBefore', { count: months });
  }
  if (offset % 7 === 0) {
    const weeks = offset / 7;
    if (weeks === 1) return t('settings.offsetWeekBefore');
    return t('settings.offsetWeeksBefore', { count: weeks });
  }
  return t('settings.offsetDaysBefore', { count: offset });
}
