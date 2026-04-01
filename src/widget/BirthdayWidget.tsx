import React from 'react';
import { FlexWidget, ListWidget, TextWidget, ImageWidget } from 'react-native-android-widget';

interface BirthdayItem {
  contactId: string;
  name: string;
  date: string;
  daysUntil: number;
  age?: number;
  isFavorite: boolean;
  imageDataUri?: `data:image${string}`;
}

interface BirthdayWidgetProps {
  birthdays: BirthdayItem[];
  title: string;
  isDark?: boolean;
  maxEntries?: number;
}

const LIGHT_COLORS = {
  background: '#FFFFFF',
  surface: '#F5FDFB',
  primary: '#00897B',
  onPrimary: '#FFFFFF',
  text: '#1B1B1B',
  textSecondary: '#757575',
  avatarBg: '#E0F2F1',
  empty: '#9E9E9E',
};

const DARK_COLORS = {
  background: '#191C1B',
  surface: '#2C2F2E',
  primary: '#4FDBB7',
  onPrimary: '#003730',
  text: '#E2E3DE',
  textSecondary: '#8C9490',
  avatarBg: '#1F3530',
  empty: '#8C9490',
};

export function getVisibleWidgetRows(birthdays: BirthdayItem[], maxEntries = 5): BirthdayItem[] {
  return birthdays.slice(0, maxEntries);
}

function BirthdayRow({ item, colors }: { item: BirthdayItem; colors: typeof LIGHT_COLORS }) {
  const daysText = item.daysUntil === 0
    ? '🎂 Heute!'
    : `in ${item.daysUntil} ${item.daysUntil === 1 ? 'Tag' : 'Tagen'}`;

  const ageText = item.age ? ` · wird ${item.age}` : '';

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      clickActionData={{ contactId: item.contactId }}
      style={{
        flexDirection: 'row',
        padding: 8,
        alignItems: 'center',
        width: 'match_parent',
      }}
    >
      {item.imageDataUri ? (
        <ImageWidget
          image={item.imageDataUri}
          imageWidth={36}
          imageHeight={36}
          radius={18}
        />
      ) : (
        <FlexWidget
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: item.daysUntil === 0 ? colors.primary : colors.avatarBg,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text={item.name.charAt(0).toUpperCase()}
            style={{
              fontSize: 16,
              color: item.daysUntil === 0 ? colors.onPrimary : colors.primary,
            }}
          />
        </FlexWidget>
      )}
      <FlexWidget style={{ flex: 1, marginLeft: 10, flexDirection: 'column' }}>
        <TextWidget
          text={`${item.name}${item.isFavorite ? ' ♥' : ''}`}
          style={{ fontSize: 14, color: colors.text }}
          maxLines={1}
        />
        <TextWidget
          text={`${item.date}${ageText}`}
          style={{ fontSize: 12, color: colors.textSecondary }}
        />
      </FlexWidget>
      <FlexWidget style={{ alignItems: 'flex-end', marginLeft: 4 }}>
        <TextWidget
          text={daysText}
          style={{
            fontSize: 12,
            color: item.daysUntil === 0 ? colors.primary : colors.empty,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

export function BirthdayWidget({ birthdays, title, isDark = false, maxEntries = 5 }: BirthdayWidgetProps) {
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const visibleRows = getVisibleWidgetRows(birthdays, maxEntries);

  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: colors.background,
        borderRadius: 16,
        padding: 12,
        flexDirection: 'column',
      }}
      clickAction="OPEN_APP"
    >
      {/* Header */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 8,
          width: 'match_parent',
        }}
      >
        <TextWidget
          text="🎂"
          style={{ fontSize: 20 }}
        />
        <TextWidget
          text={`  ${title}`}
          style={{ fontSize: 16, color: colors.primary }}
        />
      </FlexWidget>

      {/* Birthday list */}
      {visibleRows.length === 0 ? (
        <FlexWidget
          style={{
            width: 'match_parent',
            height: 'match_parent',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text="Keine anstehenden Geburtstage"
            style={{ fontSize: 13, color: colors.empty }}
          />
        </FlexWidget>
      ) : (
        <ListWidget
          style={{
            width: 'match_parent',
            height: 'match_parent',
          }}
        >
          {visibleRows.map((item) => (
            <BirthdayRow key={item.contactId} item={item} colors={colors} />
          ))}
        </ListWidget>
      )}
    </FlexWidget>
  );
}
