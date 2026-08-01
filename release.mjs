#!/usr/bin/env node
import { select, input, confirm } from '@inquirer/prompts';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Helpers ────────────────────────────────────────────────────────────────

function run(cmd, opts = {}) {
  console.log(`  › ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: __dirname, ...opts });
}

function bumpVersion(current, type) {
  const [major, minor, patch] = current.split('.').map(Number);
  if (type === 'major') return `${major + 1}.0.0`;
  if (type === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function readVersion(pkgPath) {
  return JSON.parse(readFileSync(pkgPath, 'utf8')).version;
}

function writeVersion(pkgPath, version) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.version = version;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

// ── Main ───────────────────────────────────────────────────────────────────

console.log('\n⚡ FlashAgenda Release & Publish Manager ⚡');
console.log('==========================================\n');

const frontendPkg = resolve(__dirname, 'frontend/package.json');
const backendPkg  = resolve(__dirname, 'backend/package.json');
const rootPkg     = resolve(__dirname, 'package.json');

const currentVersion = readVersion(frontendPkg);
console.log(`📌 Aktuelle Version: v${currentVersion}\n`);

// ── Step 1: Choose version ─────────────────────────────────────────────────

const versionType = await select({
  message: 'Wähle den Release-Typ:',
  choices: [
    {
      name: `patch  – Bugfix / kleines Fix  (z.B. v${bumpVersion(currentVersion, 'patch')})`,
      value: 'patch',
    },
    {
      name: `minor  – Neues Feature / Modul (z.B. v${bumpVersion(currentVersion, 'minor')})`,
      value: 'minor',
    },
    {
      name: `major  – Breaking Change       (z.B. v${bumpVersion(currentVersion, 'major')})`,
      value: 'major',
    },
    {
      name: 'custom – Eigene Version eingeben',
      value: 'custom',
    },
  ],
});

let targetVersion;
if (versionType === 'custom') {
  targetVersion = await input({
    message: 'Eigene Versionsnummer (ohne "v"):',
    validate: (v) => /^\d+\.\d+\.\d+$/.test(v.replace(/^v/, '')) || 'Bitte im Format x.y.z eingeben',
  });
  targetVersion = targetVersion.replace(/^v/, '');
} else {
  targetVersion = bumpVersion(currentVersion, versionType);
}

console.log(`\n🚀 Bereite Release v${targetVersion} vor...\n`);

// ── Step 2: Backend tests ──────────────────────────────────────────────────

console.log('🧪 1/4 Führe Backend-Tests aus (Vitest)...');
run('npm test', { cwd: resolve(__dirname, 'backend') });

// ── Step 3: Frontend build ─────────────────────────────────────────────────

console.log('\n📦 2/4 Baue Frontend-Produktionsbundle...');
run('npm run build', { cwd: resolve(__dirname, 'frontend') });

// ── Step 4: E2E tests ──────────────────────────────────────────────────────

console.log('\n🎭 3/4 Führe Frontend E2E-Tests aus (Playwright)...');
run('npx playwright test', { cwd: resolve(__dirname, 'frontend') });

// ── Step 5: Bump versions ──────────────────────────────────────────────────

console.log(`\n✍️  4/4 Aktualisiere package.json Versionen auf v${targetVersion}...`);
writeVersion(frontendPkg, targetVersion);
writeVersion(backendPkg, targetVersion);
writeVersion(rootPkg, targetVersion);
console.log('  ✅ Versionen aktualisiert.');

// ── Step 6: Git commit & tag ───────────────────────────────────────────────

const doGit = await confirm({
  message: `Änderungen committen und Tag v${targetVersion} erstellen?`,
  default: false,
});

if (doGit) {
  const defaultMsg = `Release v${targetVersion}`;
  const commitMsg = await input({
    message: 'Commit-Nachricht:',
    default: defaultMsg,
  });

  run('git add .');
  run(`git commit -m "${commitMsg}"`);
  run(`git tag -a "v${targetVersion}" -m "${commitMsg}"`);
  console.log(`  ✅ Git Commit & Tag v${targetVersion} erstellt.`);

  const doPush = await confirm({
    message: `Commit & Tag v${targetVersion} nach GitHub pushen?`,
    default: false,
  });

  if (doPush) {
    run('git push origin main');
    run(`git push origin "v${targetVersion}"`);
    console.log(`  🎉 Release v${targetVersion} erfolgreich nach GitHub gepusht!`);
  }
}

console.log(`\n✨ Release v${targetVersion} abgeschlossen!\n`);
