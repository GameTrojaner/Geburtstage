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
});
