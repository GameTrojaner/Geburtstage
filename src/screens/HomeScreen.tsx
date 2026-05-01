import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Text, useTheme, Divider, Surface, Snackbar, Chip } from 'react-native-paper';
import { Swipeable } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { BirthdayCard } from '../components/BirthdayCard';
import { groupBirthdayContacts, BirthdayGroup } from '../utils/birthday';
import { filterHomeContacts, HomeFilter } from '../utils/home';
import { ContactBirthday } from '../types';
import { requestContactsPermission } from '../services/contacts';
import { refreshAllWidgetsNow } from '../widget/requestUpdate';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Section = {
  type: 'header';
  title: string;
  key: string;
} | {
  type: 'contact';
  contact: ContactBirthday;
  key: string;
};

export function HomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    contacts,
    contactsLoading,
    hasContactsPermission,
    pinned,
    favorites,
    hidden,
    loadContacts,
    setHasContactsPermission,
    toggleFavorite,
    togglePinned,
    hideContact,
    unhideContact,
  } = useAppStore();

  const [snackVisible, setSnackVisible] = useState(false);
  const [lastHidden, setLastHidden] = useState<{ id: string; name: string } | null>(null);
  const [homeFilter, setHomeFilter] = useState<HomeFilter>('all');
  const [permissionChecked, setPermissionChecked] = useState(false);
  const swipeableRefs = useRef<Map<string, Swipeable | null>>(new Map());

  const visibleContacts = useMemo(
    () => contacts.filter(c => !hidden.has(c.contactId)),
    [contacts, hidden]
  );

  const filteredContacts = useMemo(
    () => filterHomeContacts(visibleContacts, favorites, homeFilter),
    [visibleContacts, favorites, homeFilter]
  );

  useEffect(() => {
    (async () => {
      const granted = await requestContactsPermission();
      setHasContactsPermission(granted);
      setPermissionChecked(true);
      if (granted) {
        await loadContacts();
        await refreshAllWidgetsNow();
      }
    })();
  }, []);

  const onRefresh = useCallback(async () => {
    await loadContacts();
  }, [loadContacts]);

  const groups = groupBirthdayContacts(filteredContacts, pinned);

  const sections: Section[] = [];

  const groupOrder: { key: BirthdayGroup; titleKey: string }[] = [
    { key: 'pinned', titleKey: 'home.pinned' },
    { key: 'today', titleKey: 'home.today' },
    { key: 'thisWeek', titleKey: 'home.thisWeek' },
    { key: 'thisMonth', titleKey: 'home.thisMonth' },
    { key: 'nextMonth', titleKey: 'home.nextMonth' },
    { key: 'later', titleKey: 'home.later' },
    { key: 'passed', titleKey: 'home.passed' },
  ];

  for (const group of groupOrder) {
    const items = groups[group.key];
    if (items.length > 0) {
      sections.push({ type: 'header', title: t(group.titleKey), key: `header-${group.key}` });
      for (const c of items) {
        sections.push({ type: 'contact', contact: c, key: `${group.key}-${c.contactId}` });
      }
    }
  }

  if (!permissionChecked) {
    return null;
  }

  if (!hasContactsPermission) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="bodyLarge" style={{ textAlign: 'center', padding: 32 }}>
          {t('home.noContactsPermission')}
        </Text>
      </View>
    );
  }

  if (sections.length === 0 && !contactsLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
          {t('home.noBirthdays')}
        </Text>
      </View>
    );
  }

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

  const renderItem = ({ item }: { item: Section }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.headerContainer}>
          <Text variant="titleSmall" style={[styles.sectionHeader, { color: theme.colors.primary }]}>
            {item.title}
          </Text>
          <Divider />
        </View>
      );
    }
    return (
      <Swipeable
        ref={(ref: Swipeable | null) => { swipeableRefs.current.set(item.contact.contactId, ref); }}
        renderRightActions={renderRightActions}
        onSwipeableOpen={() => {
          swipeableRefs.current.get(item.contact.contactId)?.close();
          handleHide(item.contact);
        }}
        rightThreshold={60}
      >
        <BirthdayCard
          contact={item.contact}
          isFavorite={favorites.has(item.contact.contactId)}
          isPinned={pinned.has(item.contact.contactId)}
          onPress={(c) => navigation.navigate('EditBirthday', { contactId: c.contactId })}
          onToggleFavorite={toggleFavorite}
          onTogglePin={togglePinned}
        />
      </Swipeable>
    );
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={sections}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={
          <View style={styles.filterRow}>
            <Chip selected={homeFilter === 'all'} onPress={() => setHomeFilter('all')} compact>
              {t('home.filterAll')}
            </Chip>
            <Chip selected={homeFilter === 'favorites'} onPress={() => setHomeFilter('favorites')} compact>
              {t('home.filterFavorites')}
            </Chip>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={contactsLoading} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
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
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingVertical: 8,
  },
  headerContainer: {
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    marginBottom: 4,
    fontWeight: '700',
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginVertical: 4,
    marginRight: 16,
    borderRadius: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
});
