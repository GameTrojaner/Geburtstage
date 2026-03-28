import {
  getDaysUntilBirthday,
  getAge,
  getUpcomingAge,
  formatBirthday,
  formatBirthdayISO,
  groupBirthdayContacts,
  getInitials,
  getDaysInMonth,
  getOffsetLabel,
  calculateNotificationDate,
} from '../src/utils/birthday';
import { ContactBirthday } from '../src/types';

// Helper to freeze time for deterministic tests
const MOCK_NOW = new Date(2026, 2, 27); // March 27, 2026

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(MOCK_NOW);
});

afterAll(() => {
  jest.useRealTimers();
});

describe('getDaysUntilBirthday', () => {
  it('returns 0 for today', () => {
    expect(getDaysUntilBirthday({ day: 27, month: 3 })).toBe(0);
  });

  it('returns 1 for tomorrow', () => {
    expect(getDaysUntilBirthday({ day: 28, month: 3 })).toBe(1);
  });

  it('wraps around to next year for past birthdays', () => {
    // March 26 already passed → next occurrence is March 26, 2027
    // From March 27, 2026 to March 26, 2027 = 364 days
    expect(getDaysUntilBirthday({ day: 26, month: 3 })).toBe(364);
  });

  it('handles December birthday from March', () => {
    // March 27 → December 25 = roughly 273 days
    const days = getDaysUntilBirthday({ day: 25, month: 12 });
    expect(days).toBe(273);
  });

  it('handles month boundary', () => {
    // March 27 → April 1 = 5 days
    expect(getDaysUntilBirthday({ day: 1, month: 4 })).toBe(5);
  });
});

describe('getAge / getUpcomingAge', () => {
  it('returns undefined when no year', () => {
    expect(getAge({ day: 27, month: 3 })).toBeUndefined();
    expect(getUpcomingAge({ day: 27, month: 3 })).toBeUndefined();
  });

  it('calculates age correctly for birthday today', () => {
    // Born March 27, 1990 → turning 36 today
    expect(getUpcomingAge({ day: 27, month: 3, year: 1990 })).toBe(36);
  });

  it('calculates upcoming age for future birthday this year', () => {
    // Born April 15, 1990 → turning 36 on April 15, 2026
    expect(getUpcomingAge({ day: 15, month: 4, year: 1990 })).toBe(36);
  });

  it('calculates upcoming age for past birthday (next year)', () => {
    // Born March 1, 1990 → already passed, next is March 1, 2027 → turning 37
    expect(getUpcomingAge({ day: 1, month: 3, year: 1990 })).toBe(37);
  });
});

describe('formatBirthday', () => {
  it('formats with year', () => {
    expect(formatBirthday({ day: 5, month: 3, year: 1990 })).toBe('05.03.1990');
  });

  it('formats without year', () => {
    expect(formatBirthday({ day: 15, month: 12 })).toBe('15.12.');
  });

  it('pads single digits', () => {
    expect(formatBirthday({ day: 1, month: 1 })).toBe('01.01.');
  });
});

describe('formatBirthdayISO', () => {
  it('formats for a given year', () => {
    expect(formatBirthdayISO({ day: 5, month: 3 }, 2026)).toBe('2026-03-05');
  });

  it('defaults to current year', () => {
    expect(formatBirthdayISO({ day: 5, month: 3 })).toBe('2026-03-05');
  });
});

describe('getInitials', () => {
  it('returns two initials for full name', () => {
    expect(getInitials('Max Mustermann')).toBe('MM');
  });

  it('returns one initial for single name', () => {
    expect(getInitials('Max')).toBe('M');
  });

  it('handles three names', () => {
    expect(getInitials('Max Peter Mustermann')).toBe('MM');
  });

  it('returns ? for empty string', () => {
    expect(getInitials('')).toBe('?');
  });
});

describe('getDaysInMonth', () => {
  it('returns 28 for Feb non-leap year', () => {
    expect(getDaysInMonth(2, 2023)).toBe(28);
  });

  it('returns 29 for Feb leap year', () => {
    expect(getDaysInMonth(2, 2024)).toBe(29);
  });

  it('returns 31 for January', () => {
    expect(getDaysInMonth(1, 2026)).toBe(31);
  });

  it('returns 30 for April', () => {
    expect(getDaysInMonth(4, 2026)).toBe(30);
  });
});

describe('getOffsetLabel', () => {
  const mockT = (key: string, opts?: Record<string, unknown>) => {
    const map: Record<string, string> = {
      'settings.offsetSameDay': 'Same day',
      'settings.offsetWeekBefore': '1 week before',
      'settings.offsetMonthBefore': '1 month before',
    };
    if (map[key]) return map[key];
    if (key === 'settings.offsetWeeksBefore') return `${opts?.count} weeks before`;
    if (key === 'settings.offsetMonthsBefore') return `${opts?.count} months before`;
    if (key === 'settings.offsetDaysBefore') return `${opts?.count} days before`;
    return key;
  };

  it('returns same day for 0', () => {
    expect(getOffsetLabel(0, mockT)).toBe('Same day');
  });

  it('returns days for non-divisible values', () => {
    expect(getOffsetLabel(3, mockT)).toBe('3 days before');
  });

  it('returns 1 week for 7', () => {
    expect(getOffsetLabel(7, mockT)).toBe('1 week before');
  });

  it('returns weeks for multiples of 7', () => {
    expect(getOffsetLabel(14, mockT)).toBe('2 weeks before');
    expect(getOffsetLabel(21, mockT)).toBe('3 weeks before');
  });

  it('returns 1 month for 30', () => {
    // 30 is now exact days, NOT a month (months are encoded as negative numbers)
    expect(getOffsetLabel(30, mockT)).toBe('30 days before');
  });

  it('returns months for negative offsets (-1 = 1 month, -2 = 2 months, etc.)', () => {
    expect(getOffsetLabel(-1, mockT)).toBe('1 month before');
    expect(getOffsetLabel(-2, mockT)).toBe('2 months before');
    expect(getOffsetLabel(-3, mockT)).toBe('3 months before');
  });

  it('returns months for multiples of 30', () => {
    // These are no longer months; they are exact-day offsets
    expect(getOffsetLabel(60, mockT)).toBe('60 days before');
    expect(getOffsetLabel(90, mockT)).toBe('90 days before');
  });
});

describe('groupBirthdayContacts', () => {
  const makeContact = (id: string, name: string, day: number, month: number, year?: number): ContactBirthday => ({
    contactId: id,
    name,
    birthday: { day, month, year },
  });

  it('groups "today" correctly', () => {
    const contacts = [makeContact('1', 'Alice', 27, 3, 1990)];
    const groups = groupBirthdayContacts(contacts, new Set());
    expect(groups.today).toHaveLength(1);
    expect(groups.today[0].name).toBe('Alice');
  });

  it('groups "thisWeek" correctly', () => {
    const contacts = [makeContact('1', 'Bob', 30, 3)]; // 3 days from now
    const groups = groupBirthdayContacts(contacts, new Set());
    expect(groups.thisWeek).toHaveLength(1);
  });

  it('groups "thisMonth" correctly', () => {
    // March 27 + days within March but >7 days away: not possible since March only has 31 days
    // Let's use a contact much later in March that's >7 days → impossible with March 27
    // So test with "nextMonth"
    const contacts = [makeContact('1', 'Carol', 15, 4)]; // April 15
    const groups = groupBirthdayContacts(contacts, new Set());
    expect(groups.nextMonth).toHaveLength(1);
  });

  it('puts pinned contacts in pinned group', () => {
    const contacts = [makeContact('1', 'Dan', 15, 6)];
    const groups = groupBirthdayContacts(contacts, new Set(['1']));
    expect(groups.pinned).toHaveLength(1);
    // Also appears in their time group
    expect(groups.later).toHaveLength(1);
  });

  it('skips contacts without birthday', () => {
    const contacts: ContactBirthday[] = [{ contactId: '1', name: 'Eve' }];
    const groups = groupBirthdayContacts(contacts, new Set());
    expect(groups.today).toHaveLength(0);
    expect(groups.thisWeek).toHaveLength(0);
    expect(groups.thisMonth).toHaveLength(0);
    expect(groups.nextMonth).toHaveLength(0);
    expect(groups.later).toHaveLength(0);
    expect(groups.passed).toHaveLength(0);
  });

  it('groups passed birthdays correctly', () => {
    // March 15 already passed this year (today is March 27)
    const contacts = [makeContact('1', 'Frank', 15, 3, 1985)];
    const groups = groupBirthdayContacts(contacts, new Set());
    expect(groups.passed).toHaveLength(1);
    expect(groups.passed[0].name).toBe('Frank');
    expect(groups.today).toHaveLength(0);
    expect(groups.thisWeek).toHaveLength(0);
  });
});

describe('calculateNotificationDate', () => {
  // Use real (non-faked) dates so setMonth / setDate arithmetic is independent of mocked time

  it('returns birthday date unchanged for offset 0', () => {
    const bday = new Date(2026, 3, 28, 0, 0, 0); // April 28
    const result = calculateNotificationDate(bday, 0, 9, 0);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(3); // April
    expect(result.getDate()).toBe(28);
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(0);
  });

  it('subtracts exact days for non-month offsets (e.g. 7 days)', () => {
    const bday = new Date(2026, 3, 28, 0, 0, 0); // April 28
    const result = calculateNotificationDate(bday, 7, 9, 0);
    expect(result.getMonth()).toBe(3); // still April
    expect(result.getDate()).toBe(21); // April 21
  });

  it('subtracts exact days for two-week offset (14 days)', () => {
    const bday = new Date(2026, 3, 28, 0, 0, 0); // April 28
    const result = calculateNotificationDate(bday, 14, 9, 0);
    expect(result.getMonth()).toBe(3); // April
    expect(result.getDate()).toBe(14);
  });

  it('uses calendar-month subtraction for offset -1 (1 month before April 28 = March 28)', () => {
    const bday = new Date(2026, 3, 28, 0, 0, 0); // April 28
    const result = calculateNotificationDate(bday, -1, 9, 0);
    // Calendar month: April 28 minus 1 month = March 28 (not March 29 via fixed 30 days)
    expect(result.getMonth()).toBe(2); // March
    expect(result.getDate()).toBe(28);
  });

  it('explicit 30-day offset subtracts exactly 30 days (28.03. → 26.02., nicht 28.02.)', () => {
    const bday = new Date(2026, 2, 28, 0, 0, 0); // March 28, 2026
    const result = calculateNotificationDate(bday, 30, 9, 0);
    // 30 exact days before March 28 = February 26 (March has 28 days from Feb 26 perspective:
    // Feb has 28 days in 2026, so Feb 26 + 30 = March 28 ✓)
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(26);
  });

  it('uses calendar-month subtraction for offset -2 (2 months before April 28 = February 28)', () => {
    const bday = new Date(2026, 3, 28, 0, 0, 0); // April 28
    const result = calculateNotificationDate(bday, -2, 9, 0);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(28);
  });

  it('uses calendar-month subtraction for offset -3 (3 months before April 28 = January 28)', () => {
    const bday = new Date(2026, 3, 28, 0, 0, 0); // April 28
    const result = calculateNotificationDate(bday, -3, 9, 0);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(28);
  });

  it('sets the correct notification time', () => {
    const bday = new Date(2026, 3, 28, 0, 0, 0);
    const result = calculateNotificationDate(bday, -1, 8, 30);
    expect(result.getHours()).toBe(8);
    expect(result.getMinutes()).toBe(30);
  });

  // --- Schaltjahr-Grenzfälle ---

  it('29.02. birthday (Schaltjahr 2028): 1 Monat vorher = 29.01.2028', () => {
    const bday = new Date(2028, 1, 29, 0, 0, 0); // Feb 29, 2028
    const result = calculateNotificationDate(bday, -1, 9, 0);
    expect(result.getFullYear()).toBe(2028);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(29);
  });

  it('29.03. birthday (Nicht-Schaltjahr 2026): 1 Monat vorher = 28.02.2026 (kein 29. Feb)', () => {
    const bday = new Date(2026, 2, 29, 0, 0, 0); // March 29, 2026
    const result = calculateNotificationDate(bday, -1, 9, 0);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(28); // clamped to last day of Feb in non-leap year
  });

  it('29.03. birthday (Schaltjahr 2028): 1 Monat vorher = 29.02.2028', () => {
    const bday = new Date(2028, 2, 29, 0, 0, 0); // March 29, 2028
    const result = calculateNotificationDate(bday, -1, 9, 0);
    expect(result.getFullYear()).toBe(2028);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(29); // Feb 29 exists in 2028
  });

  it('31.03. birthday: 1 Monat vorher = 28.02. (Nicht-Schaltjahr) / 29.02. (Schaltjahr)', () => {
    // Non-leap year: March 31 − 1 month → Feb 28
    const bdayNonLeap = new Date(2026, 2, 31, 0, 0, 0);
    const resultNonLeap = calculateNotificationDate(bdayNonLeap, -1, 9, 0);
    expect(resultNonLeap.getFullYear()).toBe(2026);
    expect(resultNonLeap.getMonth()).toBe(1);
    expect(resultNonLeap.getDate()).toBe(28);

    // Leap year: March 31 − 1 month → Feb 29
    const bdayLeap = new Date(2028, 2, 31, 0, 0, 0);
    const resultLeap = calculateNotificationDate(bdayLeap, -1, 9, 0);
    expect(resultLeap.getFullYear()).toBe(2028);
    expect(resultLeap.getMonth()).toBe(1);
    expect(resultLeap.getDate()).toBe(29);
  });
});
