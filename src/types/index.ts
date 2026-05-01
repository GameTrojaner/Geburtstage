export interface ContactBirthday {
  contactId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  imageUri?: string;
  rawImageUri?: string;
  imageBase64?: string;
  birthday?: {
    day: number;
    month: number;
    year?: number;
  };
}

export interface NotificationSetting {
  contactId: string;
  enabled: boolean;
  /**
   * Notification offsets relative to the birthday.
   * Positive values = days before (0 = same day, 7 = one week before).
   * Negative values = calendar months before (-1 = one month before).
   * See calculateNotificationDate() for the encoding details.
   */
  offsets: number[];
  /** Time of day for notifications (HH:mm format) */
  time: string;
}

export interface AppSettings {
  theme: 'system' | 'light' | 'dark';
  language: 'system' | 'de' | 'en';
  notificationsEnabled: boolean;
  defaultNotificationOffsets: number[];
  defaultNotificationTime: string;
  confirmBeforeWriting: boolean;
  widgetMaxEntries: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  language: 'system',
  notificationsEnabled: true,
  defaultNotificationOffsets: [0],
  defaultNotificationTime: '09:00',
  confirmBeforeWriting: true,
  widgetMaxEntries: 5,
};

export interface FavoriteContact {
  contactId: string;
}

export interface PinnedContact {
  contactId: string;
}
