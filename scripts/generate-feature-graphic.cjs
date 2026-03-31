/**
 * Generates the Play Store feature graphic (1024 × 500 px) in DE and EN.
 * Usage: node scripts/generate-feature-graphic.cjs
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WIDTH = 1024;
const HEIGHT = 500;

// App theme colours (teal palette from src/theme/index.ts)
const BG_LEFT = '#004D40';   // dark teal
const BG_RIGHT = '#00897B';  // primary teal
const ACCENT = '#4FDBB7';    // light teal accent

const LOCALES = {
  de: {
    title: 'Geburtstage',
    tagline: 'Vergiss nie wieder einen Geburtstag',
    sub: 'Offline · Werbefrei · Open Source',
  },
  en: {
    title: 'Birthdays',
    tagline: 'Never forget a birthday again',
    sub: 'Offline · Ad-free · Open Source',
  },
};

function buildSVG(locale) {
  const t = LOCALES[locale];
  return `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BG_LEFT}"/>
      <stop offset="100%" stop-color="${BG_RIGHT}"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>

  <!-- Decorative circles -->
  <circle cx="900" cy="80" r="180" fill="${ACCENT}" opacity="0.07"/>
  <circle cx="120" cy="420" r="120" fill="${ACCENT}" opacity="0.07"/>
  <circle cx="780" cy="400" r="100" fill="${ACCENT}" opacity="0.05"/>

  <!-- Decorative cake/confetti emojis as SVG text -->
  <text x="80" y="100" font-size="48" opacity="0.15">🎂</text>
  <text x="900" y="440" font-size="48" opacity="0.15">🎂</text>
  <text x="40" y="300" font-size="36" opacity="0.1">🎁</text>
  <text x="950" y="200" font-size="36" opacity="0.1">🎉</text>
  <text x="180" y="460" font-size="30" opacity="0.1">🎈</text>
  <text x="850" y="120" font-size="30" opacity="0.1">🎈</text>

  <!-- Accent line -->
  <rect x="490" y="315" width="80" height="4" rx="2" fill="${ACCENT}" opacity="0.8"/>

  <!-- App title -->
  <text x="530" y="240" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="64" font-weight="bold" fill="#FFFFFF" text-anchor="middle">
    ${t.title}
  </text>

  <!-- Tagline -->
  <text x="530" y="295" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="24" fill="${ACCENT}" text-anchor="middle">
    ${t.tagline}
  </text>

  <!-- Sub-tagline -->
  <text x="530" y="365" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="18" fill="#FFFFFF" opacity="0.7" text-anchor="middle">
    ${t.sub}
  </text>

  <!-- Bottom accent bar -->
  <rect x="0" y="${HEIGHT - 4}" width="${WIDTH}" height="4" fill="${ACCENT}" opacity="0.6"/>
</svg>`;
}

async function main() {
  // Load and resize the app icon
  const iconBuf = await sharp(path.join(__dirname, '..', 'assets', 'icon.png'))
    .resize(200, 200)
    .png()
    .toBuffer();

  for (const locale of Object.keys(LOCALES)) {
    const outDir = path.join(__dirname, '..', 'assets', 'screenshots', locale);
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, 'feature-graphic.png');

    const svg = buildSVG(locale);
    const base = sharp(Buffer.from(svg)).png();

    await base
      .composite([
        {
          input: iconBuf,
          top: 150,
          left: 60,
        },
      ])
      .png({ compressionLevel: 9 })
      .toFile(outFile);

    console.log(`[${locale}] Feature graphic saved to ${outFile}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
