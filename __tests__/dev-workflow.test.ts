import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

describe('Developer workflow guards', () => {
  const repoRoot = path.resolve(__dirname, '..');

  it('contains workspace copilot instructions with mandatory command checklist', () => {
    const filePath = path.join(repoRoot, '.github', 'copilot-instructions.md');
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('Command checklist to run on every prompt');
    expect(content).toContain('npm run test:typecheck');
    expect(content).toContain('npm test -- --runInBand');
  });

  it('uses lockfile-first install in Linux/macOS setup script', () => {
    const filePath = path.join(repoRoot, 'setup-dev.sh');
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('npm ci --legacy-peer-deps');
    expect(content).toContain('npm install --legacy-peer-deps');
    expect(content).not.toContain('rm -f "package-lock.json"');
  });

  it('uses lockfile-first install in Windows setup script', () => {
    const filePath = path.join(repoRoot, 'setup-dev.ps1');
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('npm ci --legacy-peer-deps');
    expect(content).toContain('npm install --legacy-peer-deps');
    expect(content).not.toContain('Remove-Item -Force "package-lock.json"');
  });

  it('contains fdroid readiness assets and automated config checks', () => {
    const appConfigPath = path.join(repoRoot, 'app.config.js');
    const appConfig = fs.readFileSync(appConfigPath, 'utf8');
    const appJsonPath = path.join(repoRoot, 'app.json');
    const appJson = fs.readFileSync(appJsonPath, 'utf8');

    expect(appConfig).toContain('FDROID_BUILD');
    expect(appConfig).toContain("notificationsMode: 'local-only'");
    expect(appConfig).toContain('enabled: false');

    expect(appJson).toContain('expo-notifications');
    expect(appJson).toContain('android.permission.POST_NOTIFICATIONS');

    const packageJsonPath = path.join(repoRoot, 'package.json');
    const packageJson = fs.readFileSync(packageJsonPath, 'utf8');
    expect(packageJson).toContain('fdroid:check');
    expect(packageJson).toContain('fdroid:metadata:drift');
    expect(packageJson).toContain('fdroid:android');
    expect(packageJson).toContain('-Pfdroid.build=true');
    expect(packageJson).toContain('licenses:generate');
    expect(packageJson).toContain('licenses:check');

    const checklistPath = path.join(repoRoot, 'FDROID_CHECKLIST.md');
    expect(fs.existsSync(checklistPath)).toBe(true);

    const fdroidWorkflowPath = path.join(repoRoot, '.github', 'workflows', 'fdroid-readiness.yml');
    expect(fs.existsSync(fdroidWorkflowPath)).toBe(true);

    const fdroidMetadataPath = path.join(
      repoRoot,
      'fdroid',
      'metadata',
      'io.github.gametrojaner.geburtstage.yml'
    );
    expect(fs.existsSync(fdroidMetadataPath)).toBe(true);

    const thirdPartyLicensesPath = path.join(repoRoot, 'THIRD_PARTY_LICENSES.md');
    expect(fs.existsSync(thirdPartyLicensesPath)).toBe(true);

    const licensePath = path.join(repoRoot, 'LICENSE');
    expect(fs.existsSync(licensePath)).toBe(true);

    const patentsPath = path.join(repoRoot, 'PATENTS.md');
    expect(fs.existsSync(patentsPath)).toBe(true);

    const contributingPath = path.join(repoRoot, 'CONTRIBUTING.md');
    expect(fs.existsSync(contributingPath)).toBe(true);
  });

  it('runs fdroid:check successfully in the current repository state', () => {
    const output = execFileSync('node', ['scripts/fdroid-check.cjs'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    expect(output).toContain('[fdroid-check] All checks passed.');
  });

  it('runs fdroid metadata drift invariant check successfully', () => {
    const output = execFileSync('node', ['scripts/fdroid-metadata-drift.cjs'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    expect(output).toContain('Invariants OK');
  });

  it('fdroid check scans all relevant dependency sections for forbidden packages', () => {
    const fdroidCheckPath = path.join(repoRoot, 'scripts', 'fdroid-check.cjs');
    const content = fs.readFileSync(fdroidCheckPath, 'utf8');

    expect(content).toContain('optionalDependencies');
    expect(content).toContain('peerDependencies');
    expect(content).toContain('bundledDependencies');
    expect(content).toContain('bundleDependencies');
  });

  it('fdroid check validates installed module gradle output and update lockdown fields', () => {
    const fdroidCheckPath = path.join(repoRoot, 'scripts', 'fdroid-check.cjs');
    const content = fs.readFileSync(fdroidCheckPath, 'utf8');

    expect(content).toContain('node_modules/expo-notifications/android/build.gradle');
    expect(content).toContain('node_modules/expo-application/android/build.gradle');
    expect(content).toContain('compileOnlyRegex');
    expect(content).toContain('implementationRegex');
    expect(content).toContain("checkAutomatically must be 'NEVER'");
    expect(content).toContain('fallbackToCacheTimeout must be 0');
  });

  it('fdroid check rejects proprietary google services gradle plugins', () => {
    const fdroidCheckPath = path.join(repoRoot, 'scripts', 'fdroid-check.cjs');
    const content = fs.readFileSync(fdroidCheckPath, 'utf8');

    expect(content).toContain('com\\.google\\.gms\\.google-services');
    expect(content).toContain('com\\.google\\.firebase\\.crashlytics');
    expect(content).toContain('com\\.google\\.firebase\\.perf');
  });

  it('app build.gradle excludes Firebase/GMS conditionally for F-Droid builds', () => {
    const gradlePath = path.join(repoRoot, 'android', 'app', 'build.gradle');
    const content = fs.readFileSync(gradlePath, 'utf8');

    const guardedExclusionBlockRegex =
      /if\s*\(\s*findProperty\('fdroid\.build'\)\s*==\s*'true'\s*\)\s*\{[\s\S]*?configurations\.configureEach\s*\{[\s\S]*?exclude group: 'com\.google\.firebase'[\s\S]*?exclude group: 'com\.google\.android\.gms'[\s\S]*?exclude group: 'com\.android\.installreferrer'[\s\S]*?\}[\s\S]*?\}/m;

    expect(content).toMatch(guardedExclusionBlockRegex);
  });

  it('fdroid metadata uses tagged commits and fdroid.build flag for release builds', () => {
    const metadataPath = path.join(
      repoRoot,
      'fdroid',
      'metadata',
      'io.github.gametrojaner.geburtstage.yml'
    );
    const content = fs.readFileSync(metadataPath, 'utf8');

    expect(content).not.toContain('commit: HEAD');

    const commandEntries = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- '))
      .map((line) => line.slice(2));

    const assembleReleaseCommands = commandEntries.filter((line) => line.includes('assembleRelease'));

    expect(assembleReleaseCommands.length).toBeGreaterThan(0);
    for (const line of assembleReleaseCommands) {
      expect(line).toContain('-Pfdroid.build=true');
    }
  });
});
