import { DEFAULT_SETTINGS } from '../types';

const SUPPORTED_WIDGET_MAX_ENTRIES = [3, 5, 7, 10] as const;

type SupportedWidgetMaxEntries = (typeof SUPPORTED_WIDGET_MAX_ENTRIES)[number];

export function normalizeWidgetMaxEntries(
  rawValue: unknown,
  fallback: number = DEFAULT_SETTINGS.widgetMaxEntries
): SupportedWidgetMaxEntries {
  const numericValue = typeof rawValue === 'number' ? rawValue : Number.parseInt(String(rawValue), 10);

  if (!Number.isFinite(numericValue)) {
    if (SUPPORTED_WIDGET_MAX_ENTRIES.includes(fallback as SupportedWidgetMaxEntries)) {
      return fallback as SupportedWidgetMaxEntries;
    }
    return DEFAULT_SETTINGS.widgetMaxEntries as SupportedWidgetMaxEntries;
  }

  if (SUPPORTED_WIDGET_MAX_ENTRIES.includes(numericValue as SupportedWidgetMaxEntries)) {
    return numericValue as SupportedWidgetMaxEntries;
  }

  if (SUPPORTED_WIDGET_MAX_ENTRIES.includes(fallback as SupportedWidgetMaxEntries)) {
    return fallback as SupportedWidgetMaxEntries;
  }

  return DEFAULT_SETTINGS.widgetMaxEntries as SupportedWidgetMaxEntries;
}
