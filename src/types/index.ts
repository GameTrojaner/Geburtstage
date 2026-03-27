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
  /** Offsets in days before the birthday (0 = same day) */
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
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  language: 'system',
  notificationsEnabled: true,
  defaultNotificationOffsets: [0],
  defaultNotificationTime: '09:00',
  confirmBeforeWriting: true,
};

export interface FavoriteContact {
  contactId: string;
}

export interface PinnedContact {
  contactId: string;
}
