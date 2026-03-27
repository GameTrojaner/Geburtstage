import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Chip,
  Dialog,
  Divider,
  List,
  Portal,
  RadioButton,
  Surface,
  Switch,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { useAppStore } from '../store';
import { OffsetPickerDialog } from '../components/OffsetPickerDialog';
import { getOffsetLabel } from '../utils/birthday';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { exportAllData, importAllData, ExportData } from '../services/database';
import { AppSettings, DEFAULT_SETTINGS } from '../types';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

export function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { settings, updateSetting, loadSettings, loadFavorites, loadPinned, loadHidden, loadNotificationSettings, rescheduleNotifications, contacts, hidden } = useAppStore();

  const [themeDialogVisible, setThemeDialogVisible] = useState(false);
  const [langDialogVisible, setLangDialogVisible] = useState(false);
  const [offsetDialogVisible, setOffsetDialogVisible] = useState(false);
  const [timeDialogVisible, setTimeDialogVisible] = useState(false);
  const [tempTime, setTempTime] = useState(settings.defaultNotificationTime);

  const hiddenContacts = useMemo(
    () => contacts.filter(c => hidden.has(c.contactId)),
    [contacts, hidden]
  );

  const handleThemeChange = async (value: AppSettings['theme']) => {
    await updateSetting('theme', value);
    setThemeDialogVisible(false);
  };

  const handleLanguageChange = async (value: AppSettings['language']) => {
    await updateSetting('language', value);
    if (value !== 'system') {
      i18n.changeLanguage(value);
    }
    setLangDialogVisible(false);
  };

  const toggleNotifications = async () => {
    await updateSetting('notificationsEnabled', !settings.notificationsEnabled);
    await rescheduleNotifications();
  };

  const toggleConfirmBeforeWriting = async () => {
    await updateSetting('confirmBeforeWriting', !settings.confirmBeforeWriting);
  };

  const addDefaultOffset = async (days: number) => {
    if (!settings.defaultNotificationOffsets.includes(days)) {
      const newOffsets = [...settings.defaultNotificationOffsets, days].sort((a, b) => a - b);
      await updateSetting('defaultNotificationOffsets', newOffsets);
    }
    setOffsetDialogVisible(false);
  };

  const removeDefaultOffset = async (offset: number) => {
    const newOffsets = settings.defaultNotificationOffsets.filter(o => o !== offset);
    await updateSetting('defaultNotificationOffsets', newOffsets);
  };

  const saveDefaultTime = async () => {
    await updateSetting('defaultNotificationTime', tempTime);
    setTimeDialogVisible(false);
    await rescheduleNotifications();
  };

  const getThemeLabel = () => {
    switch (settings.theme) {
      case 'system': return t('settings.themeSystem');
      case 'light': return t('settings.themeLight');
      case 'dark': return t('settings.themeDark');
    }
  };

  const getLanguageLabel = () => {
    switch (settings.language) {
      case 'system': return t('settings.languageSystem');
      case 'de': return t('settings.languageDe');
      case 'en': return t('settings.languageEn');
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportAllData();
      const json = JSON.stringify(data, null, 2);
      const file = new File(Paths.document, 'geburtstage-config.json');
      await file.write(json);
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: t('settings.exportConfig'),
      });
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const pickedAsset = result.assets[0];
      const file = new File(pickedAsset.uri);
      const content = await file.text();
      const data: ExportData = JSON.parse(content);

      await importAllData(data);
      await loadSettings();
      await loadFavorites();
      await loadPinned();
      await loadHidden();
      await loadNotificationSettings();
      await rescheduleNotifications();
      Alert.alert(t('settings.importSuccess'));
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert(t('settings.importError'));
    }
  };

  const handleResetConfig = async () => {
    Alert.alert(
      t('settings.resetConfig'),
      t('settings.resetConfigConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Reset all settings to defaults and clear data
              await importAllData({
                version: 1,
                settings: DEFAULT_SETTINGS,
                notificationSettings: [],
                favorites: [],
                pinned: [],
                hidden: [],
              });
              await loadSettings();
              await loadFavorites();
              await loadPinned();
              await loadHidden();
              await loadNotificationSettings();
              await rescheduleNotifications();
              Alert.alert(t('settings.resetSuccess'));
            } catch (error) {
              console.error('Reset error:', error);
              Alert.alert(t('settings.resetError'));
            }
          },
        },
      ]
    );
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView>
        {/* Appearance */}
        <List.Section>
          <List.Subheader>{t('settings.appearance')}</List.Subheader>

          <List.Item
            title={t('settings.theme')}
            description={getThemeLabel()}
            left={props => <List.Icon {...props} icon="brightness-6" />}
            onPress={() => setThemeDialogVisible(true)}
          />

          <List.Item
            title={t('settings.language')}
            description={getLanguageLabel()}
            left={props => <List.Icon {...props} icon="translate" />}
            onPress={() => setLangDialogVisible(true)}
          />
        </List.Section>

        <Divider />

        {/* Notifications */}
        <List.Section>
          <List.Subheader>{t('settings.notifications')}</List.Subheader>

          <List.Item
            title={t('settings.notificationsEnabled')}
            left={props => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch value={settings.notificationsEnabled} onValueChange={toggleNotifications} />
            )}
          />

          {settings.notificationsEnabled && (
            <>
              <List.Item
                title={t('settings.defaultTime')}
                description={settings.defaultNotificationTime}
                left={props => <List.Icon {...props} icon="clock-outline" />}
                onPress={() => {
                  setTempTime(settings.defaultNotificationTime);
                  setTimeDialogVisible(true);
                }}
              />

              <List.Item
                title={t('settings.defaultOffsets')}
                left={props => <List.Icon {...props} icon="calendar-clock" />}
                description={() => (
                  <View style={styles.offsetsRow}>
                    {settings.defaultNotificationOffsets.map(offset => (
                      <Chip
                        key={offset}
                        mode="outlined"
                        closeIcon="close"
                        onClose={() => removeDefaultOffset(offset)}
                        compact
                        style={styles.offsetChip}
                      >
                        {getOffsetLabel(offset, t)}
                      </Chip>
                    ))}
                    <Chip
                      mode="outlined"
                      icon="plus"
                      onPress={() => setOffsetDialogVisible(true)}
                      compact
                      style={styles.offsetChip}
                    >
                      {t('settings.addOffset')}
                    </Chip>
                  </View>
                )}
              />
            </>
          )}
        </List.Section>

        <Divider />

        {/* Data */}
        <List.Section>
          <List.Subheader>{t('settings.data')}</List.Subheader>

          <List.Item
            title={t('settings.confirmWrite')}
            left={props => <List.Icon {...props} icon="shield-check" />}
            right={() => (
              <Switch value={settings.confirmBeforeWriting} onValueChange={toggleConfirmBeforeWriting} />
            )}
          />

          <List.Item
            title={t('settings.exportConfig')}
            left={props => <List.Icon {...props} icon="export" />}
            onPress={handleExport}
          />

          <List.Item
            title={t('settings.importConfig')}
            left={props => <List.Icon {...props} icon="import" />}
            onPress={handleImport}
          />

          <List.Item
            title={t('settings.resetConfig')}
            description={t('settings.resetConfigDesc')}
            left={props => <List.Icon {...props} icon="restart" />}
            onPress={handleResetConfig}
          />

          <List.Item
            title={t('settings.hiddenContacts')}
            description={t('settings.hiddenCount', { count: hiddenContacts.length })}
            left={props => <List.Icon {...props} icon="eye-off" />}
            onPress={() => navigation.navigate('HiddenContacts')}
            right={props => <List.Icon {...props} icon="chevron-right" />}
          />
        </List.Section>

        <Divider />

        {/* About */}
        <List.Section>
          <List.Subheader>{t('settings.about')}</List.Subheader>
          <List.Item
            title={t('settings.version')}
            description="1.0.0"
            left={props => <List.Icon {...props} icon="information" />}
          />
        </List.Section>
      </ScrollView>

      {/* Theme Dialog */}
      <Portal>
        <Dialog visible={themeDialogVisible} onDismiss={() => setThemeDialogVisible(false)}>
          <Dialog.Title>{t('settings.theme')}</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group onValueChange={(v) => handleThemeChange(v as AppSettings['theme'])} value={settings.theme}>
              <RadioButton.Item label={t('settings.themeSystem')} value="system" />
              <RadioButton.Item label={t('settings.themeLight')} value="light" />
              <RadioButton.Item label={t('settings.themeDark')} value="dark" />
            </RadioButton.Group>
          </Dialog.Content>
        </Dialog>

        {/* Language Dialog */}
        <Dialog visible={langDialogVisible} onDismiss={() => setLangDialogVisible(false)}>
          <Dialog.Title>{t('settings.language')}</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group onValueChange={(v) => handleLanguageChange(v as AppSettings['language'])} value={settings.language}>
              <RadioButton.Item label={t('settings.languageSystem')} value="system" />
              <RadioButton.Item label={t('settings.languageDe')} value="de" />
              <RadioButton.Item label={t('settings.languageEn')} value="en" />
            </RadioButton.Group>
          </Dialog.Content>
        </Dialog>

        {/* Time Dialog */}
        <Dialog visible={timeDialogVisible} onDismiss={() => setTimeDialogVisible(false)}>
          <Dialog.Title>{t('settings.defaultTime')}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              value={tempTime}
              onChangeText={setTempTime}
              placeholder="09:00"
              keyboardType="numbers-and-punctuation"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setTimeDialogVisible(false)}>{t('common.cancel')}</Button>
            <Button onPress={saveDefaultTime}>{t('common.save')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <OffsetPickerDialog
        visible={offsetDialogVisible}
        onDismiss={() => setOffsetDialogVisible(false)}
        onAdd={addDefaultOffset}
        existingOffsets={settings.defaultNotificationOffsets}
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  offsetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  offsetChip: {
    marginRight: 0,
  },
});
