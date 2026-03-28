import { AppSettings, NotificationSetting } from '../types';

export interface ImportData {
  version: 1;
  settings: AppSettings;
  notificationSettings: NotificationSetting[];
  favorites: string[];
  pinned: string[];
  hidden: string[];
}

export function sanitizeImportData(data: ImportData, existingContactIds?: Set<string>): ImportData {
  const normalizedHidden = data.hidden ?? [];
  const base: ImportData = {
    ...data,
    hidden: normalizedHidden,
  };

  if (!existingContactIds) {
    return base;
  }

  const inContacts = (contactId: string) => existingContactIds.has(contactId);
  const unique = (ids: string[]) => [...new Set(ids)];

  return {
    ...base,
    notificationSettings: base.notificationSettings.filter(ns => inContacts(ns.contactId)),
    favorites: unique(base.favorites).filter(inContacts),
    pinned: unique(base.pinned).filter(inContacts),
    hidden: unique(base.hidden).filter(inContacts),
  };
}
