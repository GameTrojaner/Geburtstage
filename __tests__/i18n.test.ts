import de from '../src/i18n/de.json';
import en from '../src/i18n/en.json';

/**
 * Ensure both translation files have the same keys.
 */

function flattenKeys(obj: Record<string, any>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys.push(...flattenKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

describe('i18n translations', () => {
  const deKeys = flattenKeys(de).sort();
  const enKeys = flattenKeys(en).sort();

  it('DE and EN have the same number of keys', () => {
    expect(deKeys.length).toBe(enKeys.length);
  });

  it('DE and EN have identical key sets', () => {
    const missingInEN = deKeys.filter(k => !enKeys.includes(k));
    const missingInDE = enKeys.filter(k => !deKeys.includes(k));

    expect(missingInEN).toEqual([]);
    expect(missingInDE).toEqual([]);
  });

  it('no empty translation values in DE', () => {
    const emptyKeys = deKeys.filter(key => {
      const parts = key.split('.');
      let val: any = de;
      for (const p of parts) val = val[p];
      return typeof val === 'string' && val.trim() === '';
    });
    expect(emptyKeys).toEqual([]);
  });

  it('no empty translation values in EN', () => {
    const emptyKeys = enKeys.filter(key => {
      const parts = key.split('.');
      let val: any = en;
      for (const p of parts) val = val[p];
      return typeof val === 'string' && val.trim() === '';
    });
    expect(emptyKeys).toEqual([]);
  });
});
