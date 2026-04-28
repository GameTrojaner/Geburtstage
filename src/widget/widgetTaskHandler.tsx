import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { BirthdayWidget } from './BirthdayWidget';
import * as Contacts from 'expo-contacts';
import { File } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { getDaysUntilBirthday, getUpcomingAge, formatBirthday } from '../utils/birthday';
import { getCachedPhotoUri } from '../services/photoCache';
import { checkContactsPermission } from '../services/contacts';
import { getFavorites, getHidden } from '../services/database';
import { resolveWidgetPreferences } from './preferences';

interface BirthdayItem {
  contactId: string;
  name: string;
  date: string;
  daysUntil: number;
  age?: number;
  isFavorite: boolean;
  imageDataUri?: `data:image${string}`;
  imageUri?: string;
  rawImageUri?: string;
  inlineBase64?: string;
}

function buildAndroidPhotoCandidates(contactId: string): string[] {
  // Android ContactsProvider fallbacks for devices where expo-contacts does not expose image/rawImage.
  return [
    `content://com.android.contacts/contacts/${contactId}/display_photo`,
    `content://com.android.contacts/contacts/${contactId}/photo`,
  ];
}

function bytesToBase64(bytes: Uint8Array): string {
  // Avoid call stack limits by converting in chunks.
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  if (typeof btoa === 'function') {
    return btoa(binary);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  return '';
}

async function loadWidgetData(maxEntries: number): Promise<{ birthdays: BirthdayItem[]; favoriteBirthdays: BirthdayItem[] }> {
  try {
    if (!(await checkContactsPermission())) {
      return { birthdays: [], favoriteBirthdays: [] };
    }
    const { data } = await Contacts.getContactsAsync({
      fields: [
        Contacts.Fields.Name,
        Contacts.Fields.Birthday,
        Contacts.Fields.Image,
        Contacts.Fields.RawImage,
        Contacts.Fields.ImageAvailable,
      ],
    });

    // Load favorites and hidden contacts from database (handles init + retry internally)
    let favoriteIds: Set<string> = new Set();
    let hiddenIds: Set<string> = new Set();
    try {
      const [favs, hiddenList] = await Promise.all([getFavorites(), getHidden()]);
      favoriteIds = new Set(favs);
      hiddenIds = new Set(hiddenList);
    } catch {
      // Non-fatal: show all contacts without favorite marker or hidden filter
    }

    const items: BirthdayItem[] = [];

    for (const contact of data) {
      if (!contact.birthday || !contact.id) continue;
      if (hiddenIds.has(contact.id)) continue;

      const birthday = {
        day: contact.birthday.day!,
        month: (contact.birthday.month ?? 0) + 1,
        year: contact.birthday.year ?? undefined,
      };

      const daysUntil = getDaysUntilBirthday(birthday);
      const age = getUpcomingAge(birthday);

      items.push({
        contactId: contact.id,
        name: contact.name || 'Unknown',
        date: formatBirthday(birthday),
        daysUntil,
        age,
        isFavorite: favoriteIds.has(contact.id),
        imageUri: contact.image?.uri,
        rawImageUri: contact.rawImage?.uri,
        inlineBase64: contact.image?.base64 || contact.rawImage?.base64,
      });
    }

    // Sort by days until birthday
    items.sort((a, b) => a.daysUntil - b.daysUntil);

    const birthdays = items.slice(0, maxEntries);
    const favoriteBirthdays = items
      .filter(i => i.isFavorite)
      .slice(0, maxEntries);

    let imageHitCount = 0;
    let uriCandidateCount = 0;
    let inlineBase64Count = 0;
    let byIdBase64Count = 0;
    const toDataUri = (base64: string): `data:image${string}` => `data:image/jpeg;base64,${base64}`;

    const readBase64FromUri = async (uri?: string): Promise<string | undefined> => {
      if (!uri) return undefined;

      try {
        if (uri.startsWith('file://')) {
          return await new File(uri).base64();
        }
      } catch {
        // Fall through to legacy reader.
      }

      try {
        return await LegacyFileSystem.readAsStringAsync(uri, {
          encoding: LegacyFileSystem.EncodingType.Base64,
        });
      } catch {
        // Last fallback for content:// URIs on Android: try fetch + manual base64 conversion.
        try {
          const response = await fetch(uri);
          if (!response.ok) return undefined;
          const arrayBuffer = await response.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          return bytesToBase64(bytes);
        } catch {
          return undefined;
        }
      }
    };

    const enrichWithImages = async (list: BirthdayItem[]) => {
      await Promise.all(
        list.map(async item => {
          try {
            // 1. Try the photo cache first — pre-cached by the main app via copyAsync,
            //    which can resolve content:// URIs. This is the most reliable path.
            const cachedUri = await getCachedPhotoUri(item.contactId);
            if (cachedUri) {
              const base64 = await readBase64FromUri(cachedUri);
              if (base64) {
                item.imageDataUri = toDataUri(base64);
                imageHitCount += 1;
                return;
              }
            }

            if (item.imageUri || item.rawImageUri) {
              uriCandidateCount += 1;
            }

            let base64 = item.inlineBase64;
            if (base64) {
              inlineBase64Count += 1;
            }

            if (!base64) {
              base64 = await readBase64FromUri(item.imageUri) || await readBase64FromUri(item.rawImageUri);
            }

            const contact = await Contacts.getContactByIdAsync(item.contactId, [
              Contacts.Fields.RawImage,
              Contacts.Fields.Image,
              Contacts.Fields.ImageAvailable,
            ]);

            const byIdBase64 = contact?.image?.base64 || contact?.rawImage?.base64;
            if (!base64 && byIdBase64) {
              byIdBase64Count += 1;
            }
            base64 = base64 || byIdBase64;
            if (!base64) {
              const uri = contact?.image?.uri || contact?.rawImage?.uri;
              base64 = await readBase64FromUri(uri);
            }

            if (!base64) {
              const androidCandidates = buildAndroidPhotoCandidates(item.contactId);
              for (const candidate of androidCandidates) {
                const fromCandidate = await readBase64FromUri(candidate);
                if (fromCandidate) {
                  base64 = fromCandidate;
                  break;
                }
              }
            }

            if (base64) {
              item.imageDataUri = toDataUri(base64);
              imageHitCount += 1;
            }
          } catch {
            // Ignore image fetch failures and keep initials fallback.
          }
        })
      );
    };

    await Promise.all([enrichWithImages(birthdays), enrichWithImages(favoriteBirthdays)]);

    console.log(
      `[widget] image enrichment: ${imageHitCount}/${birthdays.length + favoriteBirthdays.length} visible rows have photos (uriCandidates=${uriCandidateCount}, inlineBase64=${inlineBase64Count}, byIdBase64=${byIdBase64Count})`
    );

    return { birthdays, favoriteBirthdays };
  } catch (error) {
    console.error('Widget data loading error:', error);
    return { birthdays: [], favoriteBirthdays: [] };
  }
}

const nameToWidget = {
  BirthdayUpcoming: 'upcoming',
  BirthdayFavorites: 'favorites',
} as const;

function resolveWidgetType(widgetName: string): 'upcoming' | 'favorites' {
  return nameToWidget[widgetName as keyof typeof nameToWidget] || 'upcoming';
}

export async function renderWidgetForName(widgetName: string) {
  const { isDark, maxEntries } = await resolveWidgetPreferences();
  const { birthdays, favoriteBirthdays } = await loadWidgetData(maxEntries);
  const widgetType = resolveWidgetType(widgetName);
  const items = widgetType === 'favorites' ? favoriteBirthdays : birthdays;
  const title = widgetType === 'favorites' ? 'Favoriten' : 'Nächste Geburtstage';

  return <BirthdayWidget birthdays={items} title={title} isDark={isDark} maxEntries={maxEntries} />;
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(await renderWidgetForName(widgetInfo.widgetName));
      break;
    case 'WIDGET_DELETED':
      break;
    case 'WIDGET_CLICK':
      // Click handling is done via clickAction in the widget components
      break;
    default:
      break;
  }
}
