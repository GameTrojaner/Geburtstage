import React, { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Surface, Text, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { ContactAvatar } from '../components/ContactAvatar';
import { ContactBirthday } from '../types';

export function HiddenContactsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { contacts, hidden, unhideContact } = useAppStore();

  const hiddenContacts = useMemo(
    () =>
      contacts
        .filter(c => hidden.has(c.contactId))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [contacts, hidden]
  );

  const renderItem = ({ item }: { item: ContactBirthday }) => (
    <View style={[styles.row, { borderBottomColor: theme.colors.outlineVariant }]}>
      <ContactAvatar name={item.name} imageUri={item.imageUri} size={44} />
      <View style={styles.info}>
        <Text variant="bodyLarge">{item.name}</Text>
      </View>
      <Button
        mode="outlined"
        compact
        onPress={() => unhideContact(item.contactId)}
        icon="eye"
      >
        {t('settings.showContact')}
      </Button>
    </View>
  );

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {hiddenContacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('settings.noHiddenContacts')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={hiddenContacts}
          renderItem={renderItem}
          keyExtractor={item => item.contactId}
          contentContainerStyle={styles.list}
        />
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
});
