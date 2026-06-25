import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = path.join(root, 'package.json');
const lockPath = path.join(root, 'package-lock.json');

const BUMP_ALIASES = {
  patch: 'patch',
  p: 'patch',
  '0.0.1': 'patch',
  minor: 'minor',
  m: 'minor',
  '0.1': 'minor',
  major: 'major',
  M: 'major',
  '1': 'major',
};

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Unsupported version format: ${version}`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function bumpVersion(version, kind) {
  const parts = parseVersion(version);
  if (kind === 'patch') {
    parts.patch += 1;
  } else if (kind === 'minor') {
    parts.minor += 1;
    parts.patch = 0;
  } else if (kind === 'major') {
    parts.major += 1;
    parts.minor = 0;
    parts.patch = 0;
  } else {
    throw new Error(`Unknown bump kind: ${kind}`);
  }
  return `${parts.major}.${parts.minor}.${parts.patch}`;
}

function syncLockfileVersion(version) {
  if (!fs.existsSync(lockPath)) {
    return;
  }
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  lock.version = version;
  if (lock.packages?.['']) {
    lock.packages[''].version = version;
  }
  fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
}

const arg = (process.argv[2] ?? '').toLowerCase();
const kind = BUMP_ALIASES[arg];

if (!kind) {
  console.error(`Usage: npm run release -- <patch|minor|major>

  patch  +0.0.1   (aliases: p, 0.0.1)
  minor  +0.1.0   (aliases: m, 0.1)
  major  +1.0.0   (aliases: M, 1)

Examples:
  npm run release -- patch
  npm run release -- minor
  npm run release -- major`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const oldVersion = pkg.version;
const newVersion = bumpVersion(oldVersion, kind);

pkg.version = newVersion;
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
syncLockfileVersion(newVersion);

console.log(`Version: ${oldVersion} → ${newVersion} (${kind})`);

execSync('npm run build', { cwd: root, stdio: 'inherit' });
execSync('npx vsce package', { cwd: root, stdio: 'inherit' });

console.log(`\nDone: pixel-weather-${newVersion}.vsix`);
console.log(
  '\nNote: README screenshots load from GitHub. Commit and push media/screenshots/ before publishing, or images will appear broken on the marketplace page.'
);
