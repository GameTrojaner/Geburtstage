import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';

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
}

export function getVisibleWidgetRows(birthdays: BirthdayItem[]): BirthdayItem[] {
  // Keep RemoteViews rendering simple to avoid collection adapter edge cases.
  return birthdays.slice(0, 3);
}

function BirthdayRow({ item }: { item: BirthdayItem }) {
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
            backgroundColor: item.daysUntil === 0 ? '#00897B' : '#E0F2F1',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text={item.name.charAt(0).toUpperCase()}
            style={{
              fontSize: 16,
              color: item.daysUntil === 0 ? '#FFFFFF' : '#00897B',
            }}
          />
        </FlexWidget>
      )}
      <FlexWidget style={{ flex: 1, marginLeft: 10, flexDirection: 'column' }}>
        <TextWidget
          text={`${item.name}${item.isFavorite ? ' ♥' : ''}`}
          style={{ fontSize: 14, color: '#1B1B1B' }}
          maxLines={1}
        />
        <TextWidget
          text={`${item.date}${ageText}`}
          style={{ fontSize: 12, color: '#757575' }}
        />
      </FlexWidget>
      <FlexWidget style={{ alignItems: 'flex-end', marginLeft: 4 }}>
        <TextWidget
          text={daysText}
          style={{
            fontSize: 12,
            color: item.daysUntil === 0 ? '#00897B' : '#9E9E9E',
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

export function BirthdayWidget({ birthdays, title }: BirthdayWidgetProps) {
  const visibleRows = getVisibleWidgetRows(birthdays);

  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: '#FFFFFF',
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
          style={{ fontSize: 16, color: '#00897B' }}
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
            style={{ fontSize: 13, color: '#9E9E9E' }}
          />
        </FlexWidget>
      ) : (
        <FlexWidget
          style={{
            width: 'match_parent',
            height: 'match_parent',
            flexDirection: 'column',
          }}
        >
          {visibleRows.map((item) => (
            <BirthdayRow key={item.contactId} item={item} />
          ))}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
