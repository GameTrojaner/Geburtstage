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
    expect(getOffsetLabel(30, mockT)).toBe('1 month before');
  });

  it('returns months for multiples of 30', () => {
    expect(getOffsetLabel(60, mockT)).toBe('2 months before');
    expect(getOffsetLabel(90, mockT)).toBe('3 months before');
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
