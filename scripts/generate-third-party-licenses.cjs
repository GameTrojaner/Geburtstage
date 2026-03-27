const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(repoRoot, 'package.json');
const outputPath = path.join(repoRoot, 'THIRD_PARTY_LICENSES.md');

function normalizeRepoUrl(repository) {
  if (!repository) return '';
  const raw = typeof repository === 'string' ? repository : repository.url || '';
  return raw
    .replace(/^git\+/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/\.git$/, '');
}

function getPackageMeta(pkgName) {
  const pkgPath = path.join(repoRoot, 'node_modules', ...pkgName.split('/'), 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return {
      name: pkgName,
      version: 'not-installed',
      license: 'UNKNOWN',
      homepage: '',
      repository: '',
    };
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  return {
    name: pkg.name || pkgName,
    version: pkg.version || 'UNKNOWN',
    license: pkg.license || 'UNKNOWN',
    homepage: pkg.homepage || '',
    repository: normalizeRepoUrl(pkg.repository),
  };
}

function sortByName(a, b) {
  return a.name.localeCompare(b.name);
}

function toRows(items) {
  return items.map((item) => {
    const link = item.homepage || item.repository || '';
    const linkValue = link ? `[link](${link})` : '-';
    return `| ${item.name} | ${item.version} | ${item.license} | ${linkValue} |`;
  });
}

const root = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const dependencies = Object.keys(root.dependencies || {}).map(getPackageMeta).sort(sortByName);
const devDependencies = Object.keys(root.devDependencies || {}).map(getPackageMeta).sort(sortByName);

const now = new Date().toISOString();

const lines = [
  '# Third-Party Licenses',
  '',
  `Generated from installed package metadata on ${now}.`,
  '',
  '## Runtime Dependencies',
  '',
  '| Package | Version | License | Project |',
  '|---|---|---|---|',
  ...toRows(dependencies),
  '',
  '## Development Dependencies',
  '',
  '| Package | Version | License | Project |',
  '|---|---|---|---|',
  ...toRows(devDependencies),
  '',
  '## Notes',
  '',
  '- This file lists metadata from each package `package.json`.',
  '- Verify copyleft obligations and NOTICE requirements before release.',
];

fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);
