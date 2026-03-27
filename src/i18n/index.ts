import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import de from './de.json';
import en from './en.json';

const resources = {
  de: { translation: de },
  en: { translation: en },
};

const getDeviceLanguage = (): string => {
  const locales = Localization.getLocales();
  if (locales.length > 0) {
    const lang = locales[0].languageCode;
    if (lang && (lang === 'de' || lang === 'en')) {
      return lang;
    }
  }
  return 'en';
};

i18n.use(initReactI18next).init({
  resources,
  lng: getDeviceLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
