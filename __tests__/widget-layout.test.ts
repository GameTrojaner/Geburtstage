jest.mock('react-native-android-widget', () => ({
  FlexWidget: () => null,
  TextWidget: () => null,
  ImageWidget: () => null,
}));

import { getVisibleWidgetRows } from '../src/widget/BirthdayWidget';

describe('getVisibleWidgetRows', () => {
  it('returns max 3 rows to keep widget rendering predictable', () => {
    const rows = [
      { contactId: '1', name: 'A', date: '1.1', daysUntil: 1, isFavorite: false },
      { contactId: '2', name: 'B', date: '2.1', daysUntil: 2, isFavorite: false },
      { contactId: '3', name: 'C', date: '3.1', daysUntil: 3, isFavorite: false },
      { contactId: '4', name: 'D', date: '4.1', daysUntil: 4, isFavorite: false },
    ];

    expect(getVisibleWidgetRows(rows)).toEqual(rows.slice(0, 3));
  });

  it('returns empty list for empty input', () => {
    expect(getVisibleWidgetRows([])).toEqual([]);
  });
});
