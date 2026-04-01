import fs from 'fs';
import path from 'path';

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

  it('app build.gradle excludes Firebase/GMS conditionally for F-Droid builds', () => {
    const gradlePath = path.join(repoRoot, 'android', 'app', 'build.gradle');
    const content = fs.readFileSync(gradlePath, 'utf8');

    expect(content).toContain("exclude group: 'com.google.firebase'");
    expect(content).toContain("exclude group: 'com.google.android.gms'");
    expect(content).toContain("exclude group: 'com.android.installreferrer'");
    // Must be conditional so regular dev builds are unaffected
    expect(content).toContain("findProperty('fdroid.build')");
  });
});
