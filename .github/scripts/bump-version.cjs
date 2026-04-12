#!/usr/bin/env node
/**
 * .github/scripts/bump-version.cjs
 *
 * Called by GitHub Actions workflows to bump the version across all tracked files:
 *   - package.json            (version)
 *   - app.json                (expo.version)
 *   - android/app/build.gradle (versionCode [sequential +1], versionName)
 *   - fdroid/metadata/io.github.gametrojaner.geburtstage.yml
 *
 * Usage:
 *   node .github/scripts/bump-version.cjs fix     # beta.N → beta.N+1
 *   node .github/scripts/bump-version.cjs minor   # 1.X.0-beta.N → 1.(X+1).0-beta.1
 *   node .github/scripts/bump-version.cjs major   # X.0.0-beta.N → (X+1).0.0-beta.1
 *   node .github/scripts/bump-version.cjs 1.2.3-beta.5  # explicit version
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function readFile(rel)          { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function writeFile(rel, content){ fs.writeFileSync(path.join(ROOT, rel), content, 'utf8'); console.log(`  updated  ${rel}`); }

// ---------------------------------------------------------------------------
// Version string arithmetic
// ---------------------------------------------------------------------------

function bumpVersion(version, type) {
  if (!['fix', 'minor', 'major'].includes(type)) {
    // Treat as explicit version string
    return type;
  }

  const preMatch = version.match(/^(\d+)\.(\d+)\.(\d+)-(\w+)\.(\d+)$/);
  const stableMatch = version.match(/^(\d+)\.(\d+)\.(\d+)$/);

  if (preMatch) {
    const [, major, minor, patch, preTag, preNum] = preMatch;
    if (type === 'fix')   return `${major}.${minor}.${patch}-${preTag}.${parseInt(preNum) + 1}`;
    if (type === 'minor') return `${major}.${parseInt(minor) + 1}.0-${preTag}.1`;
    if (type === 'major') return `${parseInt(major) + 1}.0.0-${preTag}.1`;
  }

  if (stableMatch) {
    const [, major, minor, patch] = stableMatch;
    if (type === 'fix')   return `${major}.${minor}.${parseInt(patch) + 1}`;
    if (type === 'minor') return `${major}.${parseInt(minor) + 1}.0`;
    if (type === 'major') return `${parseInt(major) + 1}.0.0`;
  }

  throw new Error(`Cannot parse version string: ${version}`);
}

// ---------------------------------------------------------------------------
// Read current state
// ---------------------------------------------------------------------------

const pkgPath = 'package.json';
const pkg     = JSON.parse(readFile(pkgPath));
const oldVersion = pkg.version;

const bumpType  = (process.argv[2] || '').trim();
if (!bumpType) { console.error('Usage: bump-version.cjs <fix|minor|major|x.y.z>'); process.exit(1); }

const newVersion = bumpVersion(oldVersion, bumpType);
if (newVersion === oldVersion) {
  console.error(`New version (${newVersion}) is the same as current. Nothing to do.`);
  process.exit(1);
}

// Sequential versionCode: read current from build.gradle, increment by 1
const gradlePath = 'android/app/build.gradle';
let gradle = readFile(gradlePath);
const vcMatch = gradle.match(/versionCode\s+(\d+)/);
if (!vcMatch) { console.error('Cannot find versionCode in build.gradle'); process.exit(1); }
const newVersionCode = parseInt(vcMatch[1], 10) + 1;

console.log(`\nBumping:  ${oldVersion}  →  ${newVersion}  (versionCode ${vcMatch[1]} → ${newVersionCode})\n`);

// ---------------------------------------------------------------------------
// 1. package.json
// ---------------------------------------------------------------------------

pkg.version = newVersion;
writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// ---------------------------------------------------------------------------
// 2. app.json
// ---------------------------------------------------------------------------

const appJson = JSON.parse(readFile('app.json'));
appJson.expo.version = newVersion;
writeFile('app.json', JSON.stringify(appJson, null, 2) + '\n');

// ---------------------------------------------------------------------------
// 3. android/app/build.gradle  (sequential versionCode)
// ---------------------------------------------------------------------------

gradle = gradle
  .replace(/(\bversionCode\s+)\d+/, `$1${newVersionCode}`)
  .replace(/(\bversionName\s+)"[^"]*"/, `$1"${newVersion}"`);
writeFile(gradlePath, gradle);

// ---------------------------------------------------------------------------
// 4. F-Droid YAML
// ---------------------------------------------------------------------------

const fdroidPath = 'fdroid/metadata/io.github.gametrojaner.geburtstage.yml';
let fdroid = readFile(fdroidPath);

// Backward compatibility: convert any legacy HEAD pin to the previous release tag.
const oldTagRef = `v${oldVersion}`;
fdroid = fdroid.replace(/\n\s+commit:\s+HEAD\b/g, `\n    commit: ${oldTagRef}`);

// Append new entry
const newEntry = [
  '',
  `  - versionName: ${newVersion}`,
  `    versionCode: ${newVersionCode}`,
  `    commit: v${newVersion}`,
  `    subdir: .`,
  `    sudo:`,
  `      - apt-get update`,
  `      - apt-get install -y npm openjdk-21-jdk`,
  `    init:`,
  `      - npm ci --legacy-peer-deps`,
  `    build:`,
  `      - npm run fdroid:check`,
  `      - cd android && ./gradlew assembleRelease -Pfdroid.build=true`,
  '',
].join('\n');

fdroid = fdroid.replace(/\nAutoUpdateMode:/, `${newEntry}\nAutoUpdateMode:`);
fdroid = fdroid.replace(/^CurrentVersion:.*$/m,     `CurrentVersion: ${newVersion}`);
fdroid = fdroid.replace(/^CurrentVersionCode:.*$/m, `CurrentVersionCode: ${newVersionCode}`);
writeFile(fdroidPath, fdroid);

// ---------------------------------------------------------------------------
// Write new version to GITHUB_OUTPUT if running in Actions
// ---------------------------------------------------------------------------

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `new_version=${newVersion}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `version_code=${newVersionCode}\n`);
}

console.log(`\nDone. New version: ${newVersion} (versionCode ${newVersionCode})`);
