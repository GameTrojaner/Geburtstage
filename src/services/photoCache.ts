import * as LegacyFileSystem from 'expo-file-system/legacy';

const PHOTO_CACHE_DIR = (LegacyFileSystem.documentDirectory ?? '') + 'contact_photos/';

/** Returns the file:// path for a cached contact photo (may or may not exist yet). */
export function cachedPhotoPath(contactId: string): string {
  return `${PHOTO_CACHE_DIR}${contactId}.jpg`;
}

/**
 * Returns the cached file:// URI if a photo has been cached for this contact,
 * or null otherwise.
 */
export async function getCachedPhotoUri(contactId: string): Promise<string | null> {
  try {
    const path = cachedPhotoPath(contactId);
    const info = await LegacyFileSystem.getInfoAsync(path);
    return info.exists ? path : null;
  } catch {
    return null;
  }
}

/**
 * Copies contact photos from content:// URIs to regular file:// paths.
 * Must be called from the main app process (not from a headless/widget task),
 * because content:// resolution requires the Android ContentResolver context.
 *
 * Safe to fire-and-forget — failures per-contact are silently skipped.
 */
export async function cacheContactPhotos(
  contacts: Array<{ contactId: string; imageUri?: string; rawImageUri?: string }>
): Promise<void> {
  try {
    await LegacyFileSystem.makeDirectoryAsync(PHOTO_CACHE_DIR, { intermediates: true });
  } catch {
    // Directory likely already exists — not fatal.
  }

  await Promise.all(
    contacts.map(async contact => {
      // Prefer rawImage (higher resolution) over image.
      const uri = contact.rawImageUri ?? contact.imageUri;
      if (!uri) return;

      const dest = cachedPhotoPath(contact.contactId);
      try {
        await LegacyFileSystem.copyAsync({ from: uri, to: dest });
      } catch {
        // Silently skip — the widget will fall back to initials.
      }
    })
  );
}
