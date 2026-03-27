import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, IconButton, useTheme, TouchableRipple } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { ContactBirthday } from '../types';
import { ContactAvatar } from './ContactAvatar';
import { getDaysUntilBirthday, getUpcomingAge, formatBirthday } from '../utils/birthday';

interface BirthdayCardProps {
  contact: ContactBirthday;
  isFavorite: boolean;
  isPinned: boolean;
  onPress: (contact: ContactBirthday) => void;
  onToggleFavorite: (contactId: string) => void;
  onTogglePin: (contactId: string) => void;
}

export function BirthdayCard({
  contact,
  isFavorite,
  isPinned,
  onPress,
  onToggleFavorite,
  onTogglePin,
}: BirthdayCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  if (!contact.birthday) return null;

  const daysUntil = getDaysUntilBirthday(contact.birthday);
  const age = getUpcomingAge(contact.birthday);

  const getDaysText = () => {
    if (daysUntil === 0) return t('home.birthdayToday');
    return t('home.daysLeft', { count: daysUntil });
  };

  const getAgeText = () => {
    if (age === undefined) return '';
    return t('home.turnsYears', { age });
  };

  return (
    <Card style={[styles.card, daysUntil === 0 && { borderColor: theme.colors.primary, borderWidth: 2 }]} mode="elevated">
      <TouchableRipple onPress={() => onPress(contact)} borderless style={styles.ripple}>
        <View style={styles.content}>
          <ContactAvatar name={contact.name} imageUri={contact.imageUri} size={52} />
          <View style={styles.info}>
            <Text variant="titleMedium" numberOfLines={1}>{contact.name}</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {formatBirthday(contact.birthday)}
              {age !== undefined ? ` · ${getAgeText()}` : ''}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: daysUntil === 0 ? theme.colors.primary : theme.colors.onSurfaceVariant }}
            >
              {getDaysText()}
            </Text>
          </View>
          <View style={styles.actions}>
            <IconButton
              icon={isPinned ? 'pin' : 'pin-outline'}
              size={20}
              onPress={() => onTogglePin(contact.contactId)}
            />
            <IconButton
              icon={isFavorite ? 'heart' : 'heart-outline'}
              iconColor={isFavorite ? theme.colors.error : undefined}
              size={20}
              onPress={() => onToggleFavorite(contact.contactId)}
            />
          </View>
        </View>
      </TouchableRipple>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  ripple: {
    borderRadius: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
