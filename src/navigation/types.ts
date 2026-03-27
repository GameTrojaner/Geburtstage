export type RootStackParamList = {
  MainTabs: undefined;
  EditBirthday: { contactId: string; prefillDay?: number; prefillMonth?: number };
  HiddenContacts: undefined;
};

export type TabParamList = {
  Home: undefined;
  Contacts: undefined;
  Calendar: undefined;
  Settings: undefined;
};
