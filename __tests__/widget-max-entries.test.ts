import { normalizeWidgetMaxEntries } from '../src/widget/maxEntries';

describe('normalizeWidgetMaxEntries', () => {
  it('keeps supported values', () => {
    expect(normalizeWidgetMaxEntries(3, 5)).toBe(3);
    expect(normalizeWidgetMaxEntries(5, 3)).toBe(5);
    expect(normalizeWidgetMaxEntries(7, 5)).toBe(7);
    expect(normalizeWidgetMaxEntries(10, 5)).toBe(10);
  });

  it('parses numeric strings', () => {
    expect(normalizeWidgetMaxEntries('7', 5)).toBe(7);
  });

  it('falls back for unsupported or invalid values', () => {
    expect(normalizeWidgetMaxEntries('4', 5)).toBe(5);
    expect(normalizeWidgetMaxEntries(0, 5)).toBe(5);
    expect(normalizeWidgetMaxEntries(-1, 5)).toBe(5);
    expect(normalizeWidgetMaxEntries('abc', 5)).toBe(5);
    expect(normalizeWidgetMaxEntries('', 5)).toBe(5);
  });
});
