/**
 * Verifies that importAllData wraps all writes in a single SQLite transaction
 * so a mid-import failure leaves the database untouched.
 */

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('../src/widget/maxEntries', () => ({
  normalizeWidgetMaxEntries: (_v: unknown, def: number) => def,
}));

import * as SQLite from 'expo-sqlite';
import { DEFAULT_SETTINGS } from '../src/types';

function makeTransactionalMockDb(
  withTransactionAsyncImpl: (task: () => Promise<void>) => Promise<void>
) {
  return {
    execAsync: jest.fn().mockResolvedValue(undefined),
    getFirstAsync: jest.fn().mockResolvedValue({ ok: 1 }),
    getAllAsync: jest.fn().mockResolvedValue([]),
    runAsync: jest.fn().mockResolvedValue(undefined),
    withTransactionAsync: jest.fn().mockImplementation(withTransactionAsyncImpl),
  };
}

let importAllData: typeof import('../src/services/database').importAllData;
let openDatabaseAsync: jest.Mock;

beforeEach(() => {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  openDatabaseAsync = require('expo-sqlite').openDatabaseAsync;
  openDatabaseAsync.mockReset();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  importAllData = require('../src/services/database').importAllData;
});

const validExport = {
  version: 1 as const,
  settings: DEFAULT_SETTINGS,
  notificationSettings: [],
  favorites: ['c1'],
  pinned: [],
  hidden: [],
};

describe('importAllData transaction safety', () => {
  it('wraps all writes in withTransactionAsync', async () => {
    const db = makeTransactionalMockDb(async (task) => { await task(); });
    openDatabaseAsync.mockResolvedValue(db);

    await importAllData(validExport);

    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
  });

  it('propagates errors thrown inside the transaction', async () => {
    const db = makeTransactionalMockDb(async () => {
      throw new Error('simulated db failure');
    });
    openDatabaseAsync.mockResolvedValue(db);

    await expect(importAllData(validExport)).rejects.toThrow('simulated db failure');
  });

  it('rejects unsupported export versions before touching the database', async () => {
    const db = makeTransactionalMockDb(async (task) => { await task(); });
    openDatabaseAsync.mockResolvedValue(db);

    await expect(
      // @ts-expect-error — intentionally passing wrong version for test
      importAllData({ ...validExport, version: 99 })
    ).rejects.toThrow('Unsupported export version');

    expect(db.withTransactionAsync).not.toHaveBeenCalled();
  });
});
