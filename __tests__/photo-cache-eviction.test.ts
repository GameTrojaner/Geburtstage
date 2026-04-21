/**
 * Tests that cacheContactPhotos evicts stale cached photos for contacts
 * that no longer exist or no longer have a photo URI.
 */

const mockMakeDirectoryAsync = jest.fn().mockResolvedValue(undefined);
const mockCopyAsync = jest.fn().mockResolvedValue(undefined);
const mockReadDirectoryAsync = jest.fn();
const mockDeleteAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///data/',
  makeDirectoryAsync: (...args: unknown[]) => mockMakeDirectoryAsync(...args),
  copyAsync: (...args: unknown[]) => mockCopyAsync(...args),
  readDirectoryAsync: (...args: unknown[]) => mockReadDirectoryAsync(...args),
  deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
}));

import { cacheContactPhotos } from '../src/services/photoCache';

beforeEach(() => {
  jest.clearAllMocks();
  mockMakeDirectoryAsync.mockResolvedValue(undefined);
  mockCopyAsync.mockResolvedValue(undefined);
  mockDeleteAsync.mockResolvedValue(undefined);
});

describe('cacheContactPhotos eviction', () => {
  it('deletes cached file for a contact that no longer exists in the contacts list', async () => {
    // Only contact c1 is active; c2 has a stale cache file.
    mockReadDirectoryAsync.mockResolvedValue(['c1.jpg', 'c2.jpg']);

    await cacheContactPhotos([
      { contactId: 'c1', imageUri: 'content://c1/photo' },
    ]);

    expect(mockDeleteAsync).toHaveBeenCalledWith(
      'file:///data/contact_photos/c2.jpg',
      { idempotent: true }
    );
    expect(mockDeleteAsync).not.toHaveBeenCalledWith(
      expect.stringContaining('c1.jpg'),
      expect.anything()
    );
  });

  it('deletes cached file when contact no longer has a photo URI', async () => {
    mockReadDirectoryAsync.mockResolvedValue(['c1.jpg']);

    // c1 exists but has no photo anymore
    await cacheContactPhotos([
      { contactId: 'c1', imageUri: undefined, rawImageUri: undefined },
    ]);

    expect(mockDeleteAsync).toHaveBeenCalledWith(
      'file:///data/contact_photos/c1.jpg',
      { idempotent: true }
    );
  });

  it('does not delete files for contacts that still have a photo', async () => {
    mockReadDirectoryAsync.mockResolvedValue(['c1.jpg', 'c2.jpg']);

    await cacheContactPhotos([
      { contactId: 'c1', imageUri: 'content://c1/photo' },
      { contactId: 'c2', rawImageUri: 'content://c2/photo' },
    ]);

    expect(mockDeleteAsync).not.toHaveBeenCalled();
  });

  it('keeps going when readDirectoryAsync fails (cache dir may not exist yet)', async () => {
    mockReadDirectoryAsync.mockRejectedValue(new Error('no dir'));

    await expect(
      cacheContactPhotos([{ contactId: 'c1', imageUri: 'content://c1/photo' }])
    ).resolves.not.toThrow();
  });
});
