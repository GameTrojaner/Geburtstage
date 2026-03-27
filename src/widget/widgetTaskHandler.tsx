import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { BirthdayWidget } from './BirthdayWidget';
import * as Contacts from 'expo-contacts';
import * as SQLite from 'expo-sqlite';
import { getDaysUntilBirthday, getUpcomingAge, formatBirthday } from '../utils/birthday';

interface BirthdayItem {
  contactId: string;
  name: string;
  date: string;
  daysUntil: number;
  age?: number;
  isFavorite: boolean;
}

async function loadWidgetData(): Promise<{ birthdays: BirthdayItem[]; favoriteBirthdays: BirthdayItem[] }> {
  try {
    const { status } = await Contacts.getPermissionsAsync();
    if (status !== 'granted') {
      return { birthdays: [], favoriteBirthdays: [] };
    }

    // Load contacts
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.Birthday],
    });

    // Load favorites from SQLite
    const db = await SQLite.openDatabaseAsync('geburtstage.db');
    let favoriteIds: Set<string> = new Set();
    try {
      const rows = await db.getAllAsync<{ contact_id: string }>('SELECT contact_id FROM favorites');
      favoriteIds = new Set(rows.map(r => r.contact_id));
    } catch {
      // Table might not exist yet
    }

    const items: BirthdayItem[] = [];

    for (const contact of data) {
      if (!contact.birthday || !contact.id) continue;

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
      });
    }

    // Sort by days until birthday
    items.sort((a, b) => a.daysUntil - b.daysUntil);

    const birthdays = items.slice(0, 3);
    const favoriteBirthdays = items
      .filter(i => i.isFavorite)
      .slice(0, 3);

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

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const { birthdays, favoriteBirthdays } = await loadWidgetData();

  const widgetType = nameToWidget[widgetInfo.widgetName as keyof typeof nameToWidget] || 'upcoming';

  const items = widgetType === 'favorites' ? favoriteBirthdays : birthdays;
  const title = widgetType === 'favorites' ? 'Favoriten' : 'Nächste Geburtstage';

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(
        <BirthdayWidget birthdays={items} title={title} />
      );
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
