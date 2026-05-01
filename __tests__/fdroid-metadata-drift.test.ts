// eslint-disable-next-line @typescript-eslint/no-require-imports
const { assertNpmCiInAllBuilds } = require('../scripts/fdroid-metadata-drift.cjs');

function buildYaml(builds: string): string {
  return `Builds:\n${builds}\nAutoUpdateMode: Version\n`;
}

describe('assertNpmCiInAllBuilds', () => {
  it('passes when every build entry contains npm ci', () => {
    const content = buildYaml(
      [
        '  - versionName: 1.0.0',
        '    versionCode: 1',
        '    prebuild:',
        '      - npm ci --legacy-peer-deps',
      ].join('\n')
    );
    expect(() => assertNpmCiInAllBuilds(content)).not.toThrow();
  });

  it('throws when a build entry is missing npm ci', () => {
    const content = buildYaml(
      [
        '  - versionName: 1.0.0',
        '    versionCode: 1',
        '    build: ./gradlew assembleRelease',
      ].join('\n')
    );
    expect(() => assertNpmCiInAllBuilds(content)).toThrow(/1.0.0.*missing "npm ci"/);
  });

  it('throws for the first offending entry when multiple builds exist', () => {
    const content = buildYaml(
      [
        '  - versionName: 1.0.0',
        '    prebuild:',
        '      - npm ci --legacy-peer-deps',
        '  - versionName: 2.0.0',
        '    build: ./gradlew assembleRelease',
      ].join('\n')
    );
    expect(() => assertNpmCiInAllBuilds(content)).toThrow(/2.0.0.*missing "npm ci"/);
  });

  it('does not match npm ci in YAML comments', () => {
    const content = buildYaml(
      [
        '  - versionName: 1.0.0',
        '    # remove npm ci if not needed',
        '    build: ./gradlew assembleRelease',
      ].join('\n')
    );
    expect(() => assertNpmCiInAllBuilds(content)).toThrow(/missing "npm ci"/);
  });

  it('passes with no Builds section', () => {
    expect(() => assertNpmCiInAllBuilds('AutoUpdateMode: Version\n')).not.toThrow();
  });
});
