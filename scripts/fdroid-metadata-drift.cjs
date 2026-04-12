#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const repoRoot = path.resolve(__dirname, '..');
const defaultMetadataPath = path.join(
  repoRoot,
  'fdroid',
  'metadata',
  'io.github.gametrojaner.geburtstage.yml'
);
const MAX_REDIRECTS = 10;

function parseArgs(argv) {
  const options = {
    against: process.env.FDROID_METADATA_REF,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--against') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --against');
      }
      options.against = value;
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function loadUrl(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const getter = parsedUrl.protocol === 'https:' ? https : http;

    getter
      .get(parsedUrl, (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          if (redirectCount >= MAX_REDIRECTS) {
            response.resume();
            reject(new Error(`Failed to fetch ${url} (too many redirects)`));
            return;
          }

          const redirectUrl = new URL(response.headers.location, url).toString();
          response.resume();
          resolve(loadUrl(redirectUrl, redirectCount + 1));
          return;
        }

        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`Failed to fetch ${url} (HTTP ${response.statusCode || 'unknown'})`));
          return;
        }

        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          resolve(body);
        });
      })
      .on('error', reject);
  });
}

async function readContent(source) {
  if (/^https?:\/\//i.test(source)) {
    return loadUrl(source);
  }

  const filePath = path.isAbsolute(source) ? source : path.join(repoRoot, source);
  return fs.readFileSync(filePath, 'utf8');
}

function normalize(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n').map((line) => line.replace(/[ \t]+$/g, ''));
  return `${lines.join('\n').trimEnd()}\n`;
}

function assertMetadataInvariants(content) {
  if (content.includes('commit: HEAD')) {
    throw new Error('Found disallowed commit pin: commit: HEAD');
  }

  const commandEntries = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2));

  const assembleReleaseCommands = commandEntries.filter((line) => line.includes('assembleRelease'));

  if (assembleReleaseCommands.length === 0) {
    throw new Error('No assembleRelease command found in F-Droid metadata draft');
  }

  for (const command of assembleReleaseCommands) {
    if (!command.includes('-Pfdroid.build=true')) {
      throw new Error(`assembleRelease command missing -Pfdroid.build=true: ${command}`);
    }
  }
}

function reportFirstDiff(localContent, referenceContent) {
  const localLines = localContent.split('\n');
  const referenceLines = referenceContent.split('\n');
  const maxLength = Math.max(localLines.length, referenceLines.length);

  for (let i = 0; i < maxLength; i += 1) {
    const local = localLines[i] || '';
    const reference = referenceLines[i] || '';
    if (local !== reference) {
      return {
        line: i + 1,
        local,
        reference,
      };
    }
  }

  return null;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const localRaw = fs.readFileSync(defaultMetadataPath, 'utf8');
  assertMetadataInvariants(localRaw);
  console.log('[fdroid-metadata-drift] Invariants OK (commit: HEAD disallowed + fdroid.build flag).');

  if (!options.against) {
    console.log('[fdroid-metadata-drift] No reference configured. Set FDROID_METADATA_REF or use --against <path|url> for drift comparison.');
    return;
  }

  const referenceRaw = await readContent(options.against);
  const localNormalized = normalize(localRaw);
  const referenceNormalized = normalize(referenceRaw);

  if (localNormalized !== referenceNormalized) {
    const diff = reportFirstDiff(localNormalized, referenceNormalized);
    const locationText = diff ? `line ${diff.line}` : 'unknown location';
    const localLine = diff ? diff.local : '(n/a)';
    const referenceLine = diff ? diff.reference : '(n/a)';

    throw new Error(
      [
        `Metadata drift detected against ${options.against} (${locationText}).`,
        `local:     ${localLine}`,
        `reference: ${referenceLine}`,
      ].join('\n')
    );
  }

  console.log(`[fdroid-metadata-drift] No drift detected against ${options.against}.`);
}

main().catch((error) => {
  console.error(`[fdroid-metadata-drift] ERROR: ${error.message}`);
  process.exit(1);
});