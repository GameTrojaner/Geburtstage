/**
 * Generates Play Store screenshots (1080 × 1920 px, 9:16 portrait).
 * Usage: node scripts/generate-screenshots.cjs
 *
 * Produces 4 screenshots:
 *   1. Home screen (upcoming birthdays list)
 *   2. Calendar screen
 *   3. Settings screen
 *   4. Dark mode home screen
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const W = 1080;
const H = 1920;
const BASE_OUT_DIR = path.join(__dirname, '..', 'assets', 'screenshots');

// ─── Locale strings ──────────────────────────────────────────────
const LOCALES = {
  de: {
    homeTitle: 'Nächste Geburtstage',
    calendarTitle: 'Kalender',
    settingsTitle: 'Einstellungen',
    chipAll: 'Alle',
    chipFav: 'Favoriten',
    pinned: '📌 Angepinnt',
    today: '🎂 Heute',
    thisWeek: 'Diese Woche',
    thisMonth: 'Diesen Monat',
    later: 'Später',
    birthdayToday: '🎂 Hat heute Geburtstag!',
    inDays: (n) => `in ${n} Tagen`,
    turnsAge: (a) => `wird ${a}`,
    month: 'März 2026',
    dayHeaders: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
    calDateLabel: '31. März',
    navHome: 'Start',
    navContacts: 'Kontakte',
    navCalendar: 'Kalender',
    navSettings: 'Einstellungen',
    sectionAppearance: 'Darstellung',
    settingDesign: 'Design',
    settingDesignVal: 'System',
    settingLanguage: 'Sprache',
    settingLanguageVal: 'Deutsch',
    sectionNotifications: 'Benachrichtigungen',
    settingNotifEnabled: 'Benachrichtigungen aktiviert',
    settingDefaultTime: 'Standard-Uhrzeit',
    settingDefaultReminders: 'Standard-Erinnerungen',
    offsetSameDay: 'Am Tag',
    offset1Day: '1 Tag vorher',
    offset1Week: '1 Woche vorher',
    sectionData: 'Daten',
    settingExport: 'Daten exportieren',
    settingExportDesc: 'Einstellungen und Favoriten sichern',
    settingImport: 'Daten importieren',
    settingImportDesc: 'Aus einer Sicherung wiederherstellen',
    settingHidden: 'Ausgeblendete Kontakte',
    settingHiddenDesc: '2 Kontakte ausgeblendet',
    contacts: [
      { name: 'Anna Müller', date: '15. Apr', days: 15, age: 30, fav: true, pin: true, initials: 'AM', color: '#E91E63' },
      { name: 'Max Schmidt', date: '02. Apr', days: 2, age: 28, fav: false, pin: false, initials: 'MS', color: '#2196F3' },
      { name: 'Laura Weber', date: '31. Mär', days: 0, age: 25, fav: true, pin: false, initials: 'LW', color: '#9C27B0' },
      { name: 'Tim Fischer', date: '08. Apr', days: 8, age: 35, fav: false, pin: false, initials: 'TF', color: '#FF9800' },
      { name: 'Sophie Braun', date: '22. Apr', days: 22, age: 27, fav: true, pin: false, initials: 'SB', color: '#4CAF50' },
      { name: 'Jonas Lang', date: '10. Mai', days: 40, age: 32, fav: false, pin: false, initials: 'JL', color: '#607D8B' },
      { name: 'Emma Hoffmann', date: '18. Mai', days: 48, age: 22, fav: false, pin: false, initials: 'EH', color: '#795548' },
    ],
  },
  en: {
    homeTitle: 'Upcoming Birthdays',
    calendarTitle: 'Calendar',
    settingsTitle: 'Settings',
    chipAll: 'All',
    chipFav: 'Favorites',
    pinned: '📌 Pinned',
    today: '🎂 Today',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    later: 'Later',
    birthdayToday: '🎂 Birthday today!',
    inDays: (n) => `in ${n} days`,
    turnsAge: (a) => `turns ${a}`,
    month: 'March 2026',
    dayHeaders: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
    calDateLabel: 'March 31',
    navHome: 'Home',
    navContacts: 'Contacts',
    navCalendar: 'Calendar',
    navSettings: 'Settings',
    sectionAppearance: 'Appearance',
    settingDesign: 'Theme',
    settingDesignVal: 'System',
    settingLanguage: 'Language',
    settingLanguageVal: 'English',
    sectionNotifications: 'Notifications',
    settingNotifEnabled: 'Notifications enabled',
    settingDefaultTime: 'Default time',
    settingDefaultReminders: 'Default reminders',
    offsetSameDay: 'Same day',
    offset1Day: '1 day before',
    offset1Week: '1 week before',
    sectionData: 'Data',
    settingExport: 'Export data',
    settingExportDesc: 'Back up settings and favorites',
    settingImport: 'Import data',
    settingImportDesc: 'Restore from a backup',
    settingHidden: 'Hidden contacts',
    settingHiddenDesc: '2 contacts hidden',
    contacts: [
      { name: 'Anna Miller', date: 'Apr 15', days: 15, age: 30, fav: true, pin: true, initials: 'AM', color: '#E91E63' },
      { name: 'Max Smith', date: 'Apr 02', days: 2, age: 28, fav: false, pin: false, initials: 'MS', color: '#2196F3' },
      { name: 'Laura Weber', date: 'Mar 31', days: 0, age: 25, fav: true, pin: false, initials: 'LW', color: '#9C27B0' },
      { name: 'Tim Fisher', date: 'Apr 08', days: 8, age: 35, fav: false, pin: false, initials: 'TF', color: '#FF9800' },
      { name: 'Sophie Brown', date: 'Apr 22', days: 22, age: 27, fav: true, pin: false, initials: 'SB', color: '#4CAF50' },
      { name: 'Jonas Lang', date: 'May 10', days: 40, age: 32, fav: false, pin: false, initials: 'JL', color: '#607D8B' },
      { name: 'Emma Hoffman', date: 'May 18', days: 48, age: 22, fav: false, pin: false, initials: 'EH', color: '#795548' },
    ],
  },
};

// Theme palette
const LIGHT = {
  bg: '#F5FDFB',
  surface: '#FFFFFF',
  primary: '#00897B',
  primaryContainer: '#B5FFE6',
  onPrimary: '#FFFFFF',
  onBg: '#191C1B',
  onSurfaceVariant: '#3F4946',
  outline: '#6F7976',
  surfaceVariant: '#DBE5E1',
  error: '#BA1A1A',
  elevation1: '#EEF6F3',
  statusBar: '#00695C',
  navBar: '#EEF6F3',
};

const DARK = {
  bg: '#191C1B',
  surface: '#1E2422',
  primary: '#4FDBB7',
  primaryContainer: '#005140',
  onPrimary: '#00382B',
  onBg: '#E1E3E0',
  onSurfaceVariant: '#BFC9C5',
  outline: '#899390',
  surfaceVariant: '#3F4946',
  error: '#FFB4AB',
  elevation1: '#1E2422',
  statusBar: '#0F1513',
  navBar: '#1E2422',
};

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Draws a rounded rect path */
function roundedRect(x, y, w, h, r) {
  return `M${x + r},${y} h${w - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - 2 * r} a${r},${r} 0 0 1 -${r},${r} h-${w - 2 * r} a${r},${r} 0 0 1 -${r},-${r} v-${h - 2 * r} a${r},${r} 0 0 1 ${r},-${r} z`;
}

/** Status bar */
function statusBar(t) {
  return `
    <rect x="0" y="0" width="${W}" height="88" fill="${t.statusBar}"/>
    <text x="48" y="58" font-family="Roboto,Segoe UI,sans-serif" font-size="28" fill="#FFFFFF" font-weight="500">12:00</text>
    <!-- Battery & signal icons -->
    <rect x="${W - 120}" y="32" width="36" height="20" rx="4" fill="none" stroke="#FFFFFF" stroke-width="2"/>
    <rect x="${W - 116}" y="36" width="22" height="12" rx="2" fill="#FFFFFF"/>
    <rect x="${W - 80}" y="40" width="3" height="12" fill="#FFFFFF"/>
    <rect x="${W - 74}" y="36" width="3" height="16" fill="#FFFFFF"/>
    <rect x="${W - 68}" y="32" width="3" height="20" fill="#FFFFFF"/>
    <rect x="${W - 62}" y="28" width="3" height="24" fill="#FFFFFF"/>
  `;
}

/** App bar */
function appBar(title, t, hasBack) {
  const backIcon = hasBack
    ? `<text x="36" y="162" font-family="Roboto,Segoe UI,sans-serif" font-size="40" fill="${t.onBg}">←</text>`
    : '';
  const titleX = hasBack ? 100 : 48;
  return `
    <rect x="0" y="88" width="${W}" height="112" fill="${t.bg}"/>
    ${backIcon}
    <text x="${titleX}" y="162" font-family="Roboto,Segoe UI,sans-serif" font-size="44" font-weight="700" fill="${t.onBg}">${escapeXml(title)}</text>
  `;
}

/** Bottom navigation bar */
function bottomNav(activeIndex, t, l) {
  const tabs = [
    { icon: '🏠', label: l.navHome },
    { icon: '👥', label: l.navContacts },
    { icon: '📅', label: l.navCalendar },
    { icon: '⚙️', label: l.navSettings },
  ];
  const tabW = W / tabs.length;
  const barY = H - 140;
  let svg = `<rect x="0" y="${barY}" width="${W}" height="140" fill="${t.navBar}"/>`;
  svg += `<line x1="0" y1="${barY}" x2="${W}" y2="${barY}" stroke="${t.outline}" stroke-width="0.5" opacity="0.3"/>`;

  tabs.forEach((tab, i) => {
    const cx = tabW * i + tabW / 2;
    const active = i === activeIndex;
    const color = active ? t.primary : t.onSurfaceVariant;

    if (active) {
      svg += `<rect x="${cx - 40}" y="${barY + 12}" width="80" height="36" rx="18" fill="${t.primaryContainer}" opacity="0.6"/>`;
    }
    svg += `<text x="${cx}" y="${barY + 42}" font-size="28" text-anchor="middle" fill="${color}">${tab.icon}</text>`;
    svg += `<text x="${cx}" y="${barY + 82}" font-family="Roboto,Segoe UI,sans-serif" font-size="22" text-anchor="middle" fill="${color}" font-weight="${active ? '600' : '400'}">${tab.label}</text>`;
  });
  return svg;
}

/** Birthday card component */
function birthdayCard(contact, y, t, l, showToday) {
  const cardH = 120;
  const isToday = contact.days === 0;
  const borderExtra = isToday
    ? `<path d="${roundedRect(36, y, W - 72, cardH, 16)}" fill="none" stroke="${t.primary}" stroke-width="3"/>`
    : '';

  const daysText = isToday ? l.birthdayToday : l.inDays(contact.days);
  const daysColor = isToday ? t.primary : t.onSurfaceVariant;
  const ageText = contact.age !== undefined ? ` · ${l.turnsAge(contact.age)}` : '';

  return `
    <!-- Card shadow -->
    <path d="${roundedRect(38, y + 3, W - 72, cardH, 16)}" fill="#000000" opacity="0.06"/>
    <!-- Card background -->
    <path d="${roundedRect(36, y, W - 72, cardH, 16)}" fill="${t.surface}"/>
    ${borderExtra}
    <!-- Avatar circle -->
    <circle cx="${100}" cy="${y + cardH / 2}" r="32" fill="${contact.color}"/>
    <text x="100" y="${y + cardH / 2 + 8}" font-family="Roboto,Segoe UI,sans-serif" font-size="22" fill="#FFFFFF" text-anchor="middle" font-weight="600">${contact.initials}</text>
    <!-- Info -->
    <text x="152" y="${y + 38}" font-family="Roboto,Segoe UI,sans-serif" font-size="28" font-weight="600" fill="${t.onBg}">${escapeXml(contact.name)}</text>
    <text x="152" y="${y + 68}" font-family="Roboto,Segoe UI,sans-serif" font-size="22" fill="${t.onSurfaceVariant}">${contact.date}${ageText}</text>
    <text x="152" y="${y + 96}" font-family="Roboto,Segoe UI,sans-serif" font-size="22" fill="${daysColor}">${daysText}</text>
    <!-- Pin icon -->
    ${contact.pin ? `<text x="${W - 140}" y="${y + cardH / 2 + 6}" font-size="28" fill="${t.onSurfaceVariant}" text-anchor="middle">📌</text>` : `<text x="${W - 140}" y="${y + cardH / 2 + 6}" font-size="22" fill="${t.outline}" text-anchor="middle" opacity="0.5">○</text>`}
    <!-- Favorite icon -->
    ${contact.fav ? `<text x="${W - 80}" y="${y + cardH / 2 + 6}" font-size="28" fill="${t.error}" text-anchor="middle">❤️</text>` : `<text x="${W - 80}" y="${y + cardH / 2 + 6}" font-size="22" fill="${t.outline}" text-anchor="middle" opacity="0.5">♡</text>`}
  `;
}

/** Section header */
function sectionHeader(text, y, t) {
  return `<text x="52" y="${y + 32}" font-family="Roboto,Segoe UI,sans-serif" font-size="26" font-weight="600" fill="${t.primary}">${escapeXml(text)}</text>`;
}

/** Filter chips */
function filterChips(active, y, t, l) {
  const chips = [l.chipAll, l.chipFav];
  let svg = '';
  let x = 48;
  chips.forEach((label, i) => {
    const isActive = i === active;
    const chipW = label.length * 20 + 40;
    svg += `<path d="${roundedRect(x, y, chipW, 52, 26)}" fill="${isActive ? t.primaryContainer : 'none'}" stroke="${isActive ? t.primary : t.outline}" stroke-width="1.5"/>`;
    svg += `<text x="${x + chipW / 2}" y="${y + 34}" font-family="Roboto,Segoe UI,sans-serif" font-size="24" fill="${isActive ? t.primary : t.onSurfaceVariant}" text-anchor="middle" font-weight="${isActive ? '600' : '400'}">${label}</text>`;
    x += chipW + 16;
  });
  return svg;
}

// ─── Screenshot 1: Home Screen (Light) ───────────────────────────
function homeScreenSVG(l, t = LIGHT, darkMode = false) {
  const CONTACTS = l.contacts;
  const title = l.homeTitle;
  let svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${W}" height="${H}" fill="${t.bg}"/>`;
  svg += statusBar(t);
  svg += appBar(title, t, false);

  // Filter chips
  svg += filterChips(0, 220, t, l);

  // Group: Angepinnt
  let y = 300;
  svg += sectionHeader(l.pinned, y, t);
  y += 52;
  svg += birthdayCard(CONTACTS[0], y, t, l);
  y += 136;

  // Group: Heute
  svg += sectionHeader(l.today, y, t);
  y += 52;
  svg += birthdayCard(CONTACTS[2], y, t, l, true);
  y += 136;

  // Group: Diese Woche
  svg += sectionHeader(l.thisWeek, y, t);
  y += 52;
  svg += birthdayCard(CONTACTS[1], y, t, l);
  y += 136;

  // Group: Diesen Monat
  svg += sectionHeader(l.thisMonth, y, t);
  y += 52;
  svg += birthdayCard(CONTACTS[3], y, t, l);
  y += 136;
  svg += birthdayCard(CONTACTS[4], y, t, l);
  y += 136;

  // Group: Später
  svg += sectionHeader(l.later, y, t);
  y += 52;
  svg += birthdayCard(CONTACTS[5], y, t, l);
  y += 136;
  svg += birthdayCard(CONTACTS[6], y, t, l);

  svg += bottomNav(0, t, l);
  svg += '</svg>';
  return svg;
}

// ─── Screenshot 2: Calendar Screen ───────────────────────────────
function calendarScreenSVG(l, t = LIGHT) {
  const CONTACTS = l.contacts;
  let svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${W}" height="${H}" fill="${t.bg}"/>`;
  svg += statusBar(t);
  svg += appBar(l.calendarTitle, t, false);

  // Calendar grid
  const calY = 220;
  const calPad = 48;
  const cellW = (W - calPad * 2) / 7;
  const cellH = 90;

  // Month header
  svg += `<text x="${W / 2}" y="${calY + 40}" font-family="Roboto,Segoe UI,sans-serif" font-size="36" font-weight="700" fill="${t.onBg}" text-anchor="middle">${l.month}</text>`;
  svg += `<text x="${calPad + 20}" y="${calY + 40}" font-family="Roboto,Segoe UI,sans-serif" font-size="36" fill="${t.primary}">‹</text>`;
  svg += `<text x="${W - calPad - 20}" y="${calY + 40}" font-family="Roboto,Segoe UI,sans-serif" font-size="36" fill="${t.primary}" text-anchor="end">›</text>`;

  // Day headers
  const headerY = calY + 80;
  l.dayHeaders.forEach((d, i) => {
    const x = calPad + cellW * i + cellW / 2;
    svg += `<text x="${x}" y="${headerY}" font-family="Roboto,Segoe UI,sans-serif" font-size="22" fill="${t.onSurfaceVariant}" text-anchor="middle">${d}</text>`;
  });

  // March 2026 starts on Sunday (index 6), 31 days
  const startCol = 6; // Sunday = 6 in Mon-start grid
  const totalDays = 31;
  const birthdayDays = new Set([2, 15, 22, 31]); // days with birthdays
  const today = 31;
  const gridY = headerY + 30;

  for (let day = 1; day <= totalDays; day++) {
    const idx = startCol + day - 1;
    const col = idx % 7;
    const row = Math.floor(idx / 7);
    const cx = calPad + cellW * col + cellW / 2;
    const cy = gridY + cellH * row + cellH / 2;

    // Today highlight
    if (day === today) {
      svg += `<circle cx="${cx}" cy="${cy}" r="28" fill="${t.primary}"/>`;
      svg += `<text x="${cx}" y="${cy + 8}" font-family="Roboto,Segoe UI,sans-serif" font-size="26" fill="${t.onPrimary}" text-anchor="middle" font-weight="600">${day}</text>`;
    } else {
      svg += `<text x="${cx}" y="${cy + 8}" font-family="Roboto,Segoe UI,sans-serif" font-size="26" fill="${t.onBg}" text-anchor="middle">${day}</text>`;
    }

    // Birthday dot
    if (birthdayDays.has(day) && day !== today) {
      svg += `<circle cx="${cx}" cy="${cy + 22}" r="4" fill="${t.primary}"/>`;
    }
    if (day === today && birthdayDays.has(day)) {
      svg += `<circle cx="${cx}" cy="${cy + 22}" r="4" fill="${t.onPrimary}"/>`;
    }
  }

  // Selected day detail area
  const detailY = gridY + cellH * 5 + 40;
  svg += `<line x1="48" y1="${detailY}" x2="${W - 48}" y2="${detailY}" stroke="${t.outline}" stroke-width="0.5" opacity="0.3"/>`;
  svg += `<text x="52" y="${detailY + 50}" font-family="Roboto,Segoe UI,sans-serif" font-size="28" font-weight="600" fill="${t.primary}">${l.calDateLabel}</text>`;

  // Birthday entry for today
  const entryY = detailY + 72;
  svg += `<path d="${roundedRect(36, entryY, W - 72, 100, 16)}" fill="${t.surface}"/>`;
  svg += `<path d="${roundedRect(36, entryY, W - 72, 100, 16)}" fill="none" stroke="${t.primary}" stroke-width="2"/>`;
  svg += `<circle cx="100" cy="${entryY + 50}" r="28" fill="${CONTACTS[2].color}"/>`;
  svg += `<text x="100" y="${entryY + 58}" font-family="Roboto,Segoe UI,sans-serif" font-size="20" fill="#FFFFFF" text-anchor="middle" font-weight="600">${CONTACTS[2].initials}</text>`;
  svg += `<text x="148" y="${entryY + 38}" font-family="Roboto,Segoe UI,sans-serif" font-size="26" font-weight="600" fill="${t.onBg}">${escapeXml(CONTACTS[2].name)}</text>`;
  svg += `<text x="148" y="${entryY + 70}" font-family="Roboto,Segoe UI,sans-serif" font-size="22" fill="${t.primary}">${l.birthdayToday} · ${l.turnsAge(CONTACTS[2].age)}</text>`;

  // FAB
  svg += `<circle cx="${W - 100}" cy="${H - 220}" r="44" fill="${t.primaryContainer}"/>`;
  svg += `<text x="${W - 100}" y="${H - 212}" font-family="Roboto,Segoe UI,sans-serif" font-size="40" fill="${t.primary}" text-anchor="middle" font-weight="300">+</text>`;

  svg += bottomNav(2, t, l);
  svg += '</svg>';
  return svg;
}

// ─── Screenshot 3: Settings Screen ───────────────────────────────
function settingsScreenSVG(l, t = LIGHT) {
  let svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${W}" height="${H}" fill="${t.bg}"/>`;
  svg += statusBar(t);
  svg += appBar(l.settingsTitle, t, false);

  let y = 230;

  // Section: Darstellung
  svg += `<text x="52" y="${y}" font-family="Roboto,Segoe UI,sans-serif" font-size="24" font-weight="600" fill="${t.primary}">${escapeXml(l.sectionAppearance)}</text>`;
  y += 16;

  // Setting: Theme
  y += 70;
  svg += `<rect x="0" y="${y - 40}" width="${W}" height="80" fill="${t.bg}"/>`;
  svg += `<text x="52" y="${y}" font-family="Roboto,Segoe UI,sans-serif" font-size="28" fill="${t.onBg}">${escapeXml(l.settingDesign)}</text>`;
  svg += `<text x="52" y="${y + 32}" font-family="Roboto,Segoe UI,sans-serif" font-size="22" fill="${t.onSurfaceVariant}">${escapeXml(l.settingDesignVal)}</text>`;
  svg += `<line x1="52" y1="${y + 50}" x2="${W - 52}" y2="${y + 50}" stroke="${t.outline}" stroke-width="0.5" opacity="0.2"/>`;

  // Setting: Language
  y += 90;
  svg += `<text x="52" y="${y}" font-family="Roboto,Segoe UI,sans-serif" font-size="28" fill="${t.onBg}">${escapeXml(l.settingLanguage)}</text>`;
  svg += `<text x="52" y="${y + 32}" font-family="Roboto,Segoe UI,sans-serif" font-size="22" fill="${t.onSurfaceVariant}">${escapeXml(l.settingLanguageVal)}</text>`;
  svg += `<line x1="52" y1="${y + 50}" x2="${W - 52}" y2="${y + 50}" stroke="${t.outline}" stroke-width="0.5" opacity="0.2"/>`;

  // Section: Benachrichtigungen
  y += 90;
  svg += `<text x="52" y="${y}" font-family="Roboto,Segoe UI,sans-serif" font-size="24" font-weight="600" fill="${t.primary}">${escapeXml(l.sectionNotifications)}</text>`;

  // Toggle: Enabled
  y += 70;
  svg += `<text x="52" y="${y}" font-family="Roboto,Segoe UI,sans-serif" font-size="28" fill="${t.onBg}">${escapeXml(l.settingNotifEnabled)}</text>`;
  // Toggle switch (on)
  svg += `<rect x="${W - 120}" y="${y - 22}" width="60" height="32" rx="16" fill="${t.primary}"/>`;
  svg += `<circle cx="${W - 76}" cy="${y - 6}" r="13" fill="#FFFFFF"/>`;
  svg += `<line x1="52" y1="${y + 20}" x2="${W - 52}" y2="${y + 20}" stroke="${t.outline}" stroke-width="0.5" opacity="0.2"/>`;

  // Setting: Default time
  y += 70;
  svg += `<text x="52" y="${y}" font-family="Roboto,Segoe UI,sans-serif" font-size="28" fill="${t.onBg}">${escapeXml(l.settingDefaultTime)}</text>`;
  svg += `<text x="52" y="${y + 32}" font-family="Roboto,Segoe UI,sans-serif" font-size="22" fill="${t.onSurfaceVariant}">09:00</text>`;
  svg += `<line x1="52" y1="${y + 50}" x2="${W - 52}" y2="${y + 50}" stroke="${t.outline}" stroke-width="0.5" opacity="0.2"/>`;

  // Setting: Default offsets
  y += 90;
  svg += `<text x="52" y="${y}" font-family="Roboto,Segoe UI,sans-serif" font-size="28" fill="${t.onBg}">${escapeXml(l.settingDefaultReminders)}</text>`;
  y += 20;
  // Chips for offsets
  const offsets = [l.offsetSameDay, l.offset1Day, l.offset1Week];
  let chipX = 52;
  offsets.forEach((label) => {
    const chipW = label.length * 16 + 36;
    svg += `<path d="${roundedRect(chipX, y + 10, chipW, 44, 22)}" fill="${t.primaryContainer}" stroke="${t.primary}" stroke-width="1"/>`;
    svg += `<text x="${chipX + chipW / 2}" y="${y + 38}" font-family="Roboto,Segoe UI,sans-serif" font-size="20" fill="${t.primary}" text-anchor="middle">${escapeXml(label)}</text>`;
    chipX += chipW + 12;
  });
  svg += `<line x1="52" y1="${y + 74}" x2="${W - 52}" y2="${y + 74}" stroke="${t.outline}" stroke-width="0.5" opacity="0.2"/>`;

  // Section: Daten
  y += 120;
  svg += `<text x="52" y="${y}" font-family="Roboto,Segoe UI,sans-serif" font-size="24" font-weight="600" fill="${t.primary}">${escapeXml(l.sectionData)}</text>`;

  y += 70;
  svg += `<text x="52" y="${y}" font-family="Roboto,Segoe UI,sans-serif" font-size="28" fill="${t.onBg}">${escapeXml(l.settingExport)}</text>`;
  svg += `<text x="52" y="${y + 32}" font-family="Roboto,Segoe UI,sans-serif" font-size="22" fill="${t.onSurfaceVariant}">${escapeXml(l.settingExportDesc)}</text>`;
  svg += `<line x1="52" y1="${y + 50}" x2="${W - 52}" y2="${y + 50}" stroke="${t.outline}" stroke-width="0.5" opacity="0.2"/>`;

  y += 90;
  svg += `<text x="52" y="${y}" font-family="Roboto,Segoe UI,sans-serif" font-size="28" fill="${t.onBg}">${escapeXml(l.settingImport)}</text>`;
  svg += `<text x="52" y="${y + 32}" font-family="Roboto,Segoe UI,sans-serif" font-size="22" fill="${t.onSurfaceVariant}">${escapeXml(l.settingImportDesc)}</text>`;
  svg += `<line x1="52" y1="${y + 50}" x2="${W - 52}" y2="${y + 50}" stroke="${t.outline}" stroke-width="0.5" opacity="0.2"/>`;

  // Section: Ausgeblendete Kontakte
  y += 110;
  svg += `<text x="52" y="${y}" font-family="Roboto,Segoe UI,sans-serif" font-size="28" fill="${t.onBg}">${escapeXml(l.settingHidden)}</text>`;
  svg += `<text x="52" y="${y + 32}" font-family="Roboto,Segoe UI,sans-serif" font-size="22" fill="${t.onSurfaceVariant}">${escapeXml(l.settingHiddenDesc)}</text>`;

  // Version at bottom
  svg += `<text x="${W / 2}" y="${H - 180}" font-family="Roboto,Segoe UI,sans-serif" font-size="22" fill="${t.onSurfaceVariant}" text-anchor="middle" opacity="0.6">Version 1.0.0</text>`;

  svg += bottomNav(3, t, l);
  svg += '</svg>';
  return svg;
}

// ─── Screenshot 4: Home Screen Dark Mode ─────────────────────────
function homeScreenDarkSVG(l) {
  return homeScreenSVG(l, DARK, true);
}

async function main() {
  for (const [lang, l] of Object.entries(LOCALES)) {
    const outDir = path.join(BASE_OUT_DIR, lang);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const screens = [
      { name: 'screenshot-1-home.png', svg: homeScreenSVG(l) },
      { name: 'screenshot-2-calendar.png', svg: calendarScreenSVG(l) },
      { name: 'screenshot-3-settings.png', svg: settingsScreenSVG(l) },
      { name: 'screenshot-4-dark.png', svg: homeScreenDarkSVG(l) },
    ];

    console.log(`\n── ${lang.toUpperCase()} ──`);
    for (const screen of screens) {
      const outPath = path.join(outDir, screen.name);
      await sharp(Buffer.from(screen.svg))
        .png({ compressionLevel: 9 })
        .toFile(outPath);
      const stat = fs.statSync(outPath);
      console.log(`✓ ${lang}/${screen.name} (${(stat.size / 1024).toFixed(0)} KB)`);
    }
  }

  console.log(`\nAll screenshots saved to ${BASE_OUT_DIR}/{de,en}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
