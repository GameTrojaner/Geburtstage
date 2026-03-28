import React, { useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Checkbox,
  Chip,
  Dialog,
  Divider,
  IconButton,
  Portal,
  Surface,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { ContactAvatar } from '../components/ContactAvatar';
import { OffsetPickerDialog } from '../components/OffsetPickerDialog';
import { ContactBirthday } from '../types';
import {
  getContactById,
  saveBirthdayToContact,
  removeBirthdayFromContact,
  openNativeContactEditor,
  openNativeEditorAndReloadContact,
  shouldUseNativeEditorForContact,
} from '../services/contacts';
import { getDaysInMonth, getOffsetLabel } from '../utils/birthday';
import { getPhotoModalSource } from '../utils/photo';
import { buildNotificationSettingForContact, isValidNotificationTime } from '../utils/notificationSettings';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditBirthday'>;

export function EditBirthdayScreen({ route, navigation }: Props) {
  const { contactId, prefillDay, prefillMonth } = route.params;
  const { t } = useTranslation();
  const theme = useTheme();
  const {
    settings,
    updateSetting,
    favorites,
    pinned,
    toggleFavorite,
    togglePinned,
    notificationSettings,
    updateNotificationSetting,
    deleteNotificationSetting,
    refreshContact,
    rescheduleNotifications,
  } = useAppStore();

  const [contact, setContact] = useState<ContactBirthday | null>(null);
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [offsetPickerVisible, setOffsetPickerVisible] = useState(false);
  const [photoVisible, setPhotoVisible] = useState(false);
  const [editorOnlyMode, setEditorOnlyMode] = useState(false);

  // Notification settings for this contact
  const contactNotif = notificationSettings.get(contactId);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifOffsets, setNotifOffsets] = useState<number[]>([]);
  const [notifTime, setNotifTime] = useState('');
  const [useCustomNotif, setUseCustomNotif] = useState(false);

  useEffect(() => {
    loadContact();
  }, [contactId]);

  const loadContact = async () => {
    setLoading(true);
    const c = await getContactById(contactId);
    setContact(c);
    setEditorOnlyMode(shouldUseNativeEditorForContact(contactId));
    if (c?.birthday) {
      setDay(String(c.birthday.day));
      setMonth(String(c.birthday.month));
      setYear(c.birthday.year ? String(c.birthday.year) : '');
    } else if (prefillDay && prefillMonth) {
      setDay(String(prefillDay));
      setMonth(String(prefillMonth));
    }
    // Load notification settings
    if (contactNotif) {
      setNotifEnabled(contactNotif.enabled);
      setNotifOffsets(contactNotif.offsets);
      setNotifTime(contactNotif.time);
      // If disabled but no custom offsets, it's just a disable — not custom
      setUseCustomNotif(contactNotif.enabled ? true : false);
      // Check if offsets/time differ from defaults to determine custom
      const isCustomOffsets = JSON.stringify(contactNotif.offsets) !== JSON.stringify(settings.defaultNotificationOffsets)
        || contactNotif.time !== settings.defaultNotificationTime;
      if (contactNotif.enabled && isCustomOffsets) {
        setUseCustomNotif(true);
      } else if (contactNotif.enabled) {
        setUseCustomNotif(false);
      }
    } else {
      setNotifEnabled(true);
      setNotifOffsets(settings.defaultNotificationOffsets);
      setNotifTime(settings.defaultNotificationTime);
      setUseCustomNotif(false);
    }
    setLoading(false);
  };

  const validateDate = (): boolean => {
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = year ? parseInt(year, 10) : undefined;

    if (isNaN(d) || isNaN(m)) return false;
    if (m < 1 || m > 12) return false;
    const maxDays = getDaysInMonth(m, y ?? 2000);
    if (d < 1 || d > maxDays) return false;
    if (y !== undefined && (y < 1900 || y > new Date().getFullYear())) return false;
    return true;
  };

  const handleSave = async () => {
    if (!validateDate()) return;

    if (settings.confirmBeforeWriting) {
      setConfirmDialogVisible(true);
      return;
    }

    await doSave();
  };

  const openNativeEditorAndSync = async (): Promise<boolean> => {
    const updated = await openNativeEditorAndReloadContact(contactId);
    if (!updated) {
      Alert.alert(t('birthday.nativeEditorError'));
      return false;
    }

    // After returning from native editor, refresh local + store state.
    await refreshContact(contactId);
    setContact(updated);

    if (updated?.birthday) {
      setDay(String(updated.birthday.day));
      setMonth(String(updated.birthday.month));
      setYear(updated.birthday.year ? String(updated.birthday.year) : '');
      setEditorOnlyMode(false);
      await rescheduleNotifications();
      navigation.goBack();
    } else {
      setEditorOnlyMode(true);
    }

    return true;
  };

  const doSave = async () => {
    setSaving(true);
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = year ? parseInt(year, 10) : undefined;

    const success = await saveBirthdayToContact(contactId, { day: d, month: m, year: y });
    if (success) {
      const notificationSetting = buildNotificationSettingForContact(
        contactId,
        notifEnabled,
        useCustomNotif,
        notifOffsets,
        notifTime,
        settings
      );
      if (notificationSetting) {
        await updateNotificationSetting(notificationSetting);
      } else {
        await deleteNotificationSetting(contactId);
      }
      await refreshContact(contactId);
      await rescheduleNotifications();
      navigation.goBack();
    } else {
      setEditorOnlyMode(true);
      await openNativeEditorAndSync();
    }
    setSaving(false);
  };

  const handleSaveNotificationSettings = async () => {
    if (useCustomNotif && notifEnabled) {
      if (notifOffsets.length === 0 || !isValidNotificationTime(notifTime)) {
        Alert.alert(t('notification.invalidSettings'));
        return;
      }
    }

    const notificationSetting = buildNotificationSettingForContact(
      contactId,
      notifEnabled,
      useCustomNotif,
      notifOffsets,
      notifTime,
      settings
    );

    if (notificationSetting) {
      await updateNotificationSetting(notificationSetting);
    } else {
      await deleteNotificationSetting(contactId);
    }

    await rescheduleNotifications();
    Alert.alert(t('notification.saved'));
  };

  const handleDelete = async () => {
    setDeleteDialogVisible(false);
    setSaving(true);
    const success = await removeBirthdayFromContact(contactId);
    if (success) {
      await deleteNotificationSetting(contactId);
      await refreshContact(contactId);
      await rescheduleNotifications();
      navigation.goBack();
    }
    setSaving(false);
  };

  const addOffset = (days: number) => {
    if (!notifOffsets.includes(days)) {
      // Sort key: negative offsets are months (-1 = 1 month ≈ 30 days for ordering)
      const sortKey = (o: number) => o < 0 ? -o * 30 : o;
      setNotifOffsets([...notifOffsets, days].sort((a, b) => sortKey(a) - sortKey(b)));
    }
    setOffsetPickerVisible(false);
  };

  const removeOffset = (offset: number) => {
    setNotifOffsets(notifOffsets.filter(o => o !== offset));
  };

  if (loading || !contact) {
    return <View style={[styles.container, { backgroundColor: theme.colors.background }]} />;
  }

  const isFav = favorites.has(contactId);
  const isPin = pinned.has(contactId);
  const hasBirthday = !!contact.birthday;
  const photoSource = getPhotoModalSource(contact);

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Contact Header */}
        <View style={styles.header}>
          <Pressable onPress={() => photoSource && setPhotoVisible(true)}>
            <ContactAvatar
              name={contact.name}
              imageUri={contact.imageUri}
              fallbackImageUri={contact.rawImageUri}
              size={80}
            />
          </Pressable>
          <Text variant="headlineSmall" style={styles.name}>{contact.name}</Text>
          <View style={styles.quickActions}>
            <IconButton
              icon={isFav ? 'heart' : 'heart-outline'}
              iconColor={isFav ? theme.colors.error : undefined}
              onPress={() => toggleFavorite(contactId)}
            />
            <IconButton
              icon={isPin ? 'pin' : 'pin-outline'}
              onPress={() => togglePinned(contactId)}
            />
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* Birthday Date Inputs / Native editor fallback */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {hasBirthday ? t('birthday.title') : t('birthday.titleAdd')}
        </Text>

        {editorOnlyMode ? (
          <View style={styles.editorOnlyBox}>
            <Text variant="bodyMedium" style={styles.editorOnlyText}>
              {t('birthday.directWriteUnavailable')}
            </Text>
            <Button
              mode="contained-tonal"
              icon="open-in-new"
              onPress={openNativeEditorAndSync}
            >
              {t('birthday.openNativeEditor')}
            </Button>
          </View>
        ) : (
          <View style={styles.dateRow}>
            <TextInput
              mode="outlined"
              label={t('birthday.day')}
              value={day}
              onChangeText={setDay}
              keyboardType="number-pad"
              maxLength={2}
              style={styles.dateInput}
            />
            <TextInput
              mode="outlined"
              label={t('birthday.month')}
              value={month}
              onChangeText={setMonth}
              keyboardType="number-pad"
              maxLength={2}
              style={styles.dateInput}
            />
            <TextInput
              mode="outlined"
              label={t('birthday.year')}
              value={year}
              onChangeText={setYear}
              keyboardType="number-pad"
              maxLength={4}
              style={[styles.dateInput, { flex: 1.5 }]}
            />
          </View>
        )}

        <Divider style={styles.divider} />

        {/* Notification Settings */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('notification.settings')}
        </Text>

        <View style={styles.settingRow}>
          <View style={styles.checkboxRow}>
            <Checkbox
              status={notifEnabled ? 'checked' : 'unchecked'}
              onPress={() => setNotifEnabled(!notifEnabled)}
            />
            <Text variant="bodyMedium">{t('notification.enabled')}</Text>
          </View>
        </View>

        {notifEnabled && (
          <>
            <View style={styles.settingRow}>
              <View style={styles.checkboxRow}>
                <Checkbox
                  status={useCustomNotif ? 'checked' : 'unchecked'}
                  onPress={() => {
                    setUseCustomNotif(!useCustomNotif);
                    if (!useCustomNotif) {
                      setNotifOffsets(settings.defaultNotificationOffsets);
                      setNotifTime(settings.defaultNotificationTime);
                    }
                  }}
                />
                <Text variant="bodyMedium">{t('notification.customOffsets')}</Text>
              </View>
            </View>

            {useCustomNotif && (
              <>
                <View style={styles.offsetsContainer}>
                  {notifOffsets.map(offset => (
                    <Chip
                      key={offset}
                      mode="outlined"
                      closeIcon="close"
                      onClose={() => removeOffset(offset)}
                      style={styles.offsetChip}
                    >
                      {getOffsetLabel(offset, t)}
                    </Chip>
                  ))}
                  <Chip icon="plus" mode="outlined" onPress={() => setOffsetPickerVisible(true)} style={styles.offsetChip}>
                    {t('settings.addOffset')}
                  </Chip>
                </View>

                <TextInput
                  mode="outlined"
                  label={t('notification.customTime')}
                  value={notifTime}
                  onChangeText={setNotifTime}
                  placeholder="09:00"
                  style={styles.timeInput}
                />
              </>
            )}
          </>
        )}

        <Button
          mode="outlined"
          onPress={handleSaveNotificationSettings}
          style={styles.saveNotificationButton}
        >
          {t('notification.saveSettings')}
        </Button>

        <Divider style={styles.divider} />

        {/* Actions */}
        {!editorOnlyMode && (
          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving || !validateDate()}
            style={styles.saveButton}
          >
            {t('birthday.save')}
          </Button>
        )}

        {hasBirthday && (
          <Button
            mode="outlined"
            onPress={() => setDeleteDialogVisible(true)}
            textColor={theme.colors.error}
            style={styles.deleteButton}
          >
            {t('birthday.delete')}
          </Button>
        )}
      </ScrollView>

      {/* Confirm Write Dialog */}
      <Portal>
        <Dialog visible={confirmDialogVisible} onDismiss={() => setConfirmDialogVisible(false)}>
          <Dialog.Title>{t('birthday.confirmWrite')}</Dialog.Title>
          <Dialog.Content>
            <Text>{t('birthday.confirmWriteMessage', { name: contact.name })}</Text>
            <View style={[styles.checkboxRow, { marginTop: 12 }]}>
              <Checkbox
                status={dontShowAgain ? 'checked' : 'unchecked'}
                onPress={() => setDontShowAgain(!dontShowAgain)}
              />
              <Text variant="bodySmall">{t('birthday.dontShowAgain')}</Text>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDialogVisible(false)}>{t('birthday.no')}</Button>
            <Button
              onPress={async () => {
                setConfirmDialogVisible(false);
                if (dontShowAgain) {
                  await updateSetting('confirmBeforeWriting', false);
                }
                await doSave();
              }}
            >
              {t('birthday.yes')}
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>{t('birthday.confirmDelete')}</Dialog.Title>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>{t('birthday.no')}</Button>
            <Button onPress={handleDelete} textColor={theme.colors.error}>
              {t('birthday.yes')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <OffsetPickerDialog
        visible={offsetPickerVisible}
        onDismiss={() => setOffsetPickerVisible(false)}
        onAdd={addOffset}
        existingOffsets={notifOffsets}
      />

      {/* Full-screen photo modal */}
      <Modal
        visible={photoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoVisible(false)}
      >
        <Pressable style={styles.photoOverlay} onPress={() => setPhotoVisible(false)}>
          <Image
            source={photoSource ?? { uri: '' }}
            style={styles.photoFull}
            resizeMode="contain"
          />
        </Pressable>
      </Modal>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    marginTop: 12,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    marginTop: 4,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 1,
  },
  divider: {
    marginVertical: 20,
  },
  settingRow: {
    marginBottom: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offsetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
    paddingLeft: 8,
  },
  offsetChip: {
    marginRight: 0,
  },
  timeInput: {
    marginTop: 8,
    marginLeft: 8,
    width: 150,
  },
  editorOnlyBox: {
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  editorOnlyText: {
    opacity: 0.8,
  },
  saveButton: {
    marginBottom: 12,
  },
  deleteButton: {
    borderColor: 'transparent',
  },
  saveNotificationButton: {
    marginTop: 8,
  },
  photoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoFull: {
    width: '90%',
    height: '70%',
    borderRadius: 12,
  },
});
