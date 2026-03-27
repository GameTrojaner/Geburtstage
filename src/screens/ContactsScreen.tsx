import React, { useMemo, useRef, useState } from 'react';
import { Animated, FlatList, StyleSheet, View } from 'react-native';
import { Searchbar, Text, useTheme, TouchableRipple, Chip, Snackbar } from 'react-native-paper';
import { Swipeable } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { ContactAvatar } from '../components/ContactAvatar';
import { ContactBirthday } from '../types';
import { formatBirthday, getDaysUntilBirthday, getUpcomingAge } from '../utils/birthday';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Filter = 'all' | 'withBirthday' | 'withoutBirthday';

export function ContactsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { contacts, favorites, hidden, hideContact, unhideContact } = useAppStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [snackVisible, setSnackVisible] = useState(false);
  const [lastHidden, setLastHidden] = useState<{ id: string; name: string } | null>(null);
  const swipeableRefs = useRef<Map<string, Swipeable | null>>(new Map());

  const filtered = useMemo(() => {
    let result = contacts.filter(c => !hidden.has(c.contactId));

    // Filter
    if (filter === 'withBirthday') {
      result = result.filter(c => c.birthday);
    } else if (filter === 'withoutBirthday') {
      result = result.filter(c => !c.birthday);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(c => c.name.toLowerCase().includes(q));
    }

    // Sort alphabetically
    result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [contacts, search, filter, hidden]);

  const handleHide = async (contact: ContactBirthday) => {
    await hideContact(contact.contactId);
    setLastHidden({ id: contact.contactId, name: contact.name });
    setSnackVisible(true);
  };

  const handleUndo = async () => {
    if (lastHidden) {
      await unhideContact(lastHidden.id);
      setLastHidden(null);
    }
    setSnackVisible(false);
  };

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 0],
    });
    return (
      <Animated.View style={[styles.swipeAction, { backgroundColor: theme.colors.error, transform: [{ translateX }] }]}>
        <Text style={{ color: theme.colors.onError, fontWeight: '600' }}>{t('contacts.hide')}</Text>
      </Animated.View>
    );
  };

  const renderContact = ({ item }: { item: ContactBirthday }) => {
    const hasBirthday = !!item.birthday;
    const isFav = favorites.has(item.contactId);

    return (
      <Swipeable
        ref={(ref: Swipeable | null) => { swipeableRefs.current.set(item.contactId, ref); }}
        renderRightActions={renderRightActions}
        onSwipeableOpen={() => {
          swipeableRefs.current.get(item.contactId)?.close();
          handleHide(item);
        }}
        rightThreshold={60}
      >
        <TouchableRipple
          onPress={() => navigation.navigate('EditBirthday', { contactId: item.contactId })}
          style={[styles.contactRow, { backgroundColor: theme.colors.background }]}
        >
          <View style={styles.contactContent}>
            <ContactAvatar name={item.name} imageUri={item.imageUri} size={44} />
            <View style={styles.contactInfo}>
              <View style={styles.nameRow}>
                <Text variant="bodyLarge" numberOfLines={1} style={styles.name}>
                  {item.name}
                </Text>
                {isFav && <Text style={{ color: theme.colors.error }}>♥</Text>}
              </View>
              {hasBirthday ? (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {formatBirthday(item.birthday!)}
                  {item.birthday!.year ? ` · ${getUpcomingAge(item.birthday!)} ${t('contacts.age', { age: '' }).trim()}` : ''}
                  {` · ${getDaysUntilBirthday(item.birthday!) === 0
                    ? t('home.birthdayToday')
                    : t('home.daysLeft', { count: getDaysUntilBirthday(item.birthday!) })}`}
                </Text>
              ) : (
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                  {t('contacts.noBirthday')}
                </Text>
              )}
            </View>
          </View>
        </TouchableRipple>
      </Swipeable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Searchbar
        placeholder={t('contacts.search')}
        value={search}
        onChangeText={setSearch}
        style={styles.searchbar}
        elevation={0}
      />
      <View style={styles.filterRow}>
        <Chip
          mode="outlined"
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
          style={styles.chip}
        >
          {t('contacts.all')}
        </Chip>
        <Chip
          mode="outlined"
          selected={filter === 'withBirthday'}
          onPress={() => setFilter('withBirthday')}
          style={styles.chip}
        >
          {t('contacts.withBirthday')}
        </Chip>
        <Chip
          mode="outlined"
          selected={filter === 'withoutBirthday'}
          onPress={() => setFilter('withoutBirthday')}
          style={styles.chip}
        >
          {t('contacts.withoutBirthday')}
        </Chip>
      </View>
      <FlatList
        data={filtered}
        renderItem={renderContact}
        keyExtractor={(item) => item.contactId}
        contentContainerStyle={styles.list}
      />
      <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={4000}
        action={{ label: t('contacts.undo'), onPress: handleUndo }}
      >
        {t('contacts.hiddenMessage', { name: lastHidden?.name ?? '' })}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchbar: {
    margin: 16,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  chip: {
    marginRight: 0,
  },
  list: {
    paddingBottom: 16,
  },
  contactRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    paddingHorizontal: 12,
  },
  contactContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    flex: 1,
  },
});
