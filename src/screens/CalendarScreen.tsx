import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, FAB, Searchbar, Text, useTheme, Surface, TouchableRipple } from 'react-native-paper';
import { Calendar, DateData } from 'react-native-calendars';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { ContactAvatar } from '../components/ContactAvatar';
import { formatBirthdayISO, getUpcomingAge, formatBirthday } from '../utils/birthday';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

export function CalendarScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { contacts, hidden } = useAppStore();

  const visibleContacts = useMemo(
    () => contacts.filter(c => !hidden.has(c.contactId)),
    [contacts, hidden]
  );

  const now = new Date();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const translateX = useRef(new Animated.Value(0)).current;
  const isSwiping = useRef(false);

  const isCurrentMonth = currentYear === now.getFullYear() && currentMonth === now.getMonth() + 1;

  const contactsWithBirthday = useMemo(
    () => visibleContacts.filter(c => c.birthday),
    [visibleContacts]
  );

  // Build marked dates for the current displayed year
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};

    for (const c of contactsWithBirthday) {
      if (!c.birthday) continue;
      const dateStr = formatBirthdayISO(c.birthday, currentYear);
      if (marks[dateStr]) {
        marks[dateStr] = {
          ...marks[dateStr],
          dots: [...(marks[dateStr].dots || []), { color: theme.colors.secondary }],
        };
      } else {
        marks[dateStr] = {
          marked: true,
          dots: [{ color: theme.colors.primary }],
        };
      }
    }

    if (selectedDate && marks[selectedDate]) {
      marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: theme.colors.primary };
    } else if (selectedDate) {
      marks[selectedDate] = { selected: true, selectedColor: theme.colors.primary };
    }

    return marks;
  }, [contactsWithBirthday, currentYear, selectedDate, theme]);

  // Get contacts for selected date
  const contactsForDate = useMemo(() => {
    if (!selectedDate) return [];
    const [, m, d] = selectedDate.split('-').map(Number);
    return contactsWithBirthday.filter(c =>
      c.birthday && c.birthday.month === m && c.birthday.day === d
    );
  }, [selectedDate, contactsWithBirthday]);

  // Get contacts for current month (if no date selected)
  const contactsForMonth = useMemo(() => {
    return contactsWithBirthday
      .filter(c => c.birthday && c.birthday.month === currentMonth)
      .sort((a, b) => a.birthday!.day - b.birthday!.day);
  }, [contactsWithBirthday, currentMonth]);

  const handleDayPress = (day: DateData) => {
    // Toggle: tap same day again to deselect
    if (selectedDate === day.dateString) {
      setSelectedDate(null);
    } else {
      setSelectedDate(day.dateString);
    }
  };

  // Contact picker dialog state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const contactsWithoutBirthday = useMemo(
    () => visibleContacts.filter(c => !c.birthday).sort((a, b) => a.name.localeCompare(b.name)),
    [visibleContacts]
  );

  const filteredPickerContacts = useMemo(() => {
    if (!pickerSearch.trim()) return contactsWithoutBirthday;
    const q = pickerSearch.toLowerCase().trim();
    return contactsWithoutBirthday.filter(c => c.name.toLowerCase().includes(q));
  }, [contactsWithoutBirthday, pickerSearch]);

  const selectedDay = selectedDate ? parseInt(selectedDate.split('-')[2], 10) : 0;
  const selectedMonth = selectedDate ? parseInt(selectedDate.split('-')[1], 10) : 0;

  const handleAssignToContact = (contactId: string) => {
    setPickerVisible(false);
    setPickerSearch('');
    navigation.navigate('EditBirthday', {
      contactId,
      prefillDay: selectedDay,
      prefillMonth: selectedMonth,
    });
  };

  const commitMonthChange = useCallback((direction: 1 | -1) => {
    if (isSwiping.current) return;
    isSwiping.current = true;

    // Animate the rest of the slide out
    Animated.timing(translateX, {
      toValue: -direction * SCREEN_WIDTH,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      // Update month
      let newMonth = currentMonth + direction;
      let newYear = currentYear;
      if (newMonth > 12) { newMonth = 1; newYear++; }
      if (newMonth < 1) { newMonth = 12; newYear--; }
      setCurrentMonth(newMonth);
      setCurrentYear(newYear);
      setSelectedDate(null);

      // Jump to opposite side
      translateX.setValue(direction * SCREEN_WIDTH);

      // Slide in
      Animated.timing(translateX, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        isSwiping.current = false;
      });
    });
  }, [currentMonth, currentYear, translateX]);

  const goToToday = useCallback(() => {
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth() + 1;
    if (currentYear === todayYear && currentMonth === todayMonth) return;
    setCurrentYear(todayYear);
    setCurrentMonth(todayMonth);
    setSelectedDate(null);
    translateX.setValue(0);
  }, [currentYear, currentMonth, now, translateX]);

  const handleMonthChange = (month: DateData) => {
    setCurrentYear(month.year);
    setCurrentMonth(month.month);
    setSelectedDate(null);
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      if (!isSwiping.current) {
        translateX.setValue(e.translationX);
      }
    })
    .onEnd((e) => {
      if (isSwiping.current) return;
      if (e.translationX < -SWIPE_THRESHOLD || (e.translationX < 0 && e.velocityX < -500)) {
        commitMonthChange(1); // swipe left → next month
      } else if (e.translationX > SWIPE_THRESHOLD || (e.translationX > 0 && e.velocityX > 500)) {
        commitMonthChange(-1); // swipe right → previous month
      } else {
        // Snap back
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 120,
          friction: 12,
        }).start();
      }
    })
    .runOnJS(true);

  const displayContacts = selectedDate ? contactsForDate : contactsForMonth;

  const currentDateString = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.animatedContainer, { transform: [{ translateX }] }]}>
          <ScrollView>
            <Calendar
              key={currentDateString}
              current={currentDateString}
              onDayPress={handleDayPress}
              onMonthChange={handleMonthChange}
              markedDates={markedDates}
              markingType="multi-dot"
              theme={{
                calendarBackground: theme.colors.surface,
                textSectionTitleColor: theme.colors.onSurface,
                selectedDayBackgroundColor: theme.colors.primary,
                selectedDayTextColor: theme.colors.onPrimary,
                todayTextColor: theme.colors.primary,
                dayTextColor: theme.colors.onSurface,
                textDisabledColor: theme.colors.outline,
                dotColor: theme.colors.primary,
                selectedDotColor: theme.colors.onPrimary,
                arrowColor: theme.colors.primary,
                monthTextColor: theme.colors.onSurface,
                textDayFontWeight: '400',
                textMonthFontWeight: '600',
                textDayHeaderFontWeight: '500',
              }}
              style={styles.calendar}
              enableSwipeMonths={false}
            />

            <View style={styles.listContainer}>
              <View style={styles.listHeader}>
                <Text variant="titleSmall" style={[styles.listTitle, { color: theme.colors.primary }]}>
                  {selectedDate
                    ? `${selectedDate}`
                    : t('months.' + currentMonth)
                  }
                </Text>
                {selectedDate && (
                  <Chip
                    mode="outlined"
                    compact
                    icon="calendar-month"
                    onPress={() => setSelectedDate(null)}
                    style={styles.monthChip}
                  >
                    {t('calendar.showAllMonth')}
                  </Chip>
                )}
              </View>

              {displayContacts.length === 0 ? (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, paddingHorizontal: 16 }}>
                  {selectedDate ? t('calendar.noBirthdaysDay') : t('calendar.noBirthdays')}
                </Text>
              ) : (
                displayContacts.map(contact => (
                  <TouchableRipple
                    key={contact.contactId}
                    onPress={() => navigation.navigate('EditBirthday', { contactId: contact.contactId })}
                    style={styles.contactRow}
                  >
                    <View style={styles.contactContent}>
                      <ContactAvatar name={contact.name} imageUri={contact.imageUri} size={40} />
                      <View style={styles.contactInfo}>
                        <Text variant="bodyLarge">{contact.name}</Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {formatBirthday(contact.birthday!)}
                          {contact.birthday!.year
                            ? ` · ${t('home.turnsYears', { age: getUpcomingAge(contact.birthday!) })}`
                            : ''}
                        </Text>
                      </View>
                    </View>
                  </TouchableRipple>
                ))
              )}

              {selectedDate && (
                <View style={styles.actionButtons}>
                  <Button
                    mode="outlined"
                    icon="account-plus"
                    onPress={() => {
                      setPickerSearch('');
                      setPickerVisible(true);
                    }}
                    style={styles.actionButton}
                  >
                    {t('calendar.assignBirthday')}
                  </Button>
                </View>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </GestureDetector>

      {!isCurrentMonth && (
        <FAB
          icon="calendar-today"
          label={t('calendar.today')}
          onPress={goToToday}
          style={[styles.fab, { backgroundColor: theme.colors.primaryContainer }]}
          color={theme.colors.onPrimaryContainer}
          size="small"
        />
      )}

      {/* Contact picker modal */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <Surface style={[styles.pickerModal, { backgroundColor: theme.colors.background }]}>
          <View style={styles.pickerHeader}>
            <Text variant="titleLarge">{t('calendar.selectContact')}</Text>
            <Button onPress={() => setPickerVisible(false)}>{t('common.cancel')}</Button>
          </View>
          <Searchbar
            placeholder={t('calendar.searchContact')}
            value={pickerSearch}
            onChangeText={setPickerSearch}
            style={styles.pickerSearch}
            elevation={0}
          />
          <FlatList
            data={filteredPickerContacts}
            keyExtractor={item => item.contactId}
            renderItem={({ item }) => (
              <TouchableRipple onPress={() => handleAssignToContact(item.contactId)} style={styles.pickerRow}>
                <View style={styles.contactContent}>
                  <ContactAvatar name={item.name} imageUri={item.imageUri} size={40} />
                  <Text variant="bodyLarge" style={{ marginLeft: 12 }}>{item.name}</Text>
                </View>
              </TouchableRipple>
            )}
            ItemSeparatorComponent={() => <Divider />}
            contentContainerStyle={styles.pickerList}
          />
        </Surface>
      </Modal>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  animatedContainer: {
    flex: 1,
  },
  calendar: {
    marginBottom: 8,
  },
  listContainer: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  listTitle: {
    fontWeight: '700',
  },
  monthChip: {
    marginLeft: 8,
  },
  contactRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  contactContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  actionButtons: {
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  pickerModal: {
    flex: 1,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pickerSearch: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  pickerList: {
    paddingBottom: 16,
  },
  pickerRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
