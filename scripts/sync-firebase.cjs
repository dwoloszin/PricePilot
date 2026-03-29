// ──────────────────────────────────────────────────────────
// Bem na Mosca — DARIO WOLOSZIN
// https://github.com/dwoloszin
// ──────────────────────────────────────────────────────────
// sync-firebase.cjs
//
// Fully automated Firebase sync from .env.local
// Handles: login check → project selection → secrets → optional deploy
//
// Usage:
//   npm run sync-firebase               # secrets only
//   npm run sync-firebase -- --rules    # + deploy Firestore rules
//   npm run sync-firebase -- --deploy   # + deploy Cloud Functions
//   npm run sync-firebase -- --all      # + rules + functions + hosting

'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { execSync, spawnSync } = require('child_process');

// ── Colours ──────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  grey:   '\x1b[90m',
};
const ok   = `${c.green}✔${c.reset}`;
const fail = `${c.red}✘${c.reset}`;
const warn = `${c.yellow}!${c.reset}`;
const info = `${c.cyan}i${c.reset}`;

function header(text) {
  console.log(`\n${c.bold}${c.cyan}── ${text} ──${c.reset}`);
}
function row(label, status, note = '') {
  console.log(`  ${label.padEnd(30)} ${status}  ${c.grey}${note}${c.reset}`);
}

// ── Parse .env.local ────────────────────────────────────────
const envPath = path.resolve(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error(`${fail}  .env.local not found at ${envPath}`);
  process.exit(1);
}

const vars = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq === -1) continue;
  vars[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
}

// ── Config ───────────────────────────────────────────────────
const PROJECT_ID      = vars['VITE_FIREBASE_PROJECT_ID'];
const PLACEHOLDER     = 'REPLACE_WITH';

// Secrets = non-VITE_ vars that have real values
const ALL_SECRET_KEYS = [
  'EFI_CLIENT_ID',
  'EFI_CLIENT_SECRET',
  'EFI_CLIENT_ID_H',
  'EFI_CLIENT_SECRET_H',
  'EFI_PIX_KEY',
  'EFI_CERT_PEM',
  'EFI_CERT_KEY',
  'EFI_CERT_PEM_H',
  'EFI_CERT_KEY_H',
  'EFI_SANDBOX',
  'PROMO_CODES',
];

const secrets     = ALL_SECRET_KEYS.filter(k => vars[k] && !vars[k].includes(PLACEHOLDER));
const placeholders = ALL_SECRET_KEYS.filter(k => !vars[k] || vars[k].includes(PLACEHOLDER));

// ── CLI flags ─────────────────────────────────────────────────
const flags       = process.argv.slice(2);
const doRules     = flags.includes('--rules')  || flags.includes('--all');
const doFunctions = flags.includes('--deploy') || flags.includes('--all');
const doHosting   = flags.includes('--hosting')|| flags.includes('--all');

// ── Helper: run Firebase CLI silently ───────────────────────
function firebase(args) {
  const quotedArgs = args.map(a => `"${a.replace(/"/g, '\\"')}"`).join(' ');
  const cmd = `npx --yes --package=firebase-tools firebase ${quotedArgs}`;
  try {
    const stdout = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, stdout: stdout.trim() };
  } catch (err) {
    const out = (err.stdout || '').trim();
    const err2 = (err.stderr || '').trim();
    return { ok: false, stdout: out, stderr: err2, message: err.message };
  }
}

// Helper: run Firebase CLI with terminal I/O (for interactive commands)
function firebaseInteractive(args) {
  const result = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['--yes', '--package=firebase-tools', 'firebase', ...args],
    { stdio: 'inherit' }
  );
  return result.status === 0;
}

// ── STEP 1 — Auth check ──────────────────────────────────────
header('Step 1 / Auth');
{
  const check = firebase(['projects:list']);
  if (check.ok) {
    console.log(`  ${ok}  Already logged in.`);
  } else if (check.stdout.includes('Failed to authenticate') || check.stdout.includes('not logged in')) {
    console.log(`  ${info}  Not logged in — opening browser...\n`);
    const loginOk = firebaseInteractive(['login', '--no-localhost']);
    if (!loginOk) {
      console.error(`\n  ${fail}  Login failed. Run: firebase login`);
      process.exit(1);
    }
  } else {
    console.log(`  ${warn}  Could not verify auth. Continuing anyway...`);
  }
}

// ── STEP 2 — Project ─────────────────────────────────────────
header('Step 2 / Project');
if (!PROJECT_ID) {
  console.error(`  ${fail}  VITE_FIREBASE_PROJECT_ID not set in .env.local`);
  process.exit(1);
}
{
  const result = firebase(['use', PROJECT_ID]);
  if (result.ok) {
    console.log(`  ${ok}  Active project: ${c.bold}${PROJECT_ID}${c.reset}`);
  } else {
    console.error(`  ${fail}  Could not select project "${PROJECT_ID}":`);
    console.error(`     ${result.stdout || result.message}`);
    process.exit(1);
  }
}

// ── STEP 3 — Secrets ─────────────────────────────────────────
header('Step 3 / Secrets');

if (placeholders.length > 0) {
  console.log(`  ${warn}  Skipped (placeholder values — fill in .env.local first):`);
  for (const k of placeholders) console.log(`     ${c.grey}${k}${c.reset}`);
  console.log();
}

if (secrets.length === 0) {
  console.log(`  ${info}  No secrets to sync.`);
} else {
  let okCount = 0, failCount = 0;
  for (const key of secrets) {
    const val     = vars[key];
    const tmpFile = path.join(os.tmpdir(), `fbsecret_${key}_${Date.now()}.tmp`);
    try {
      fs.writeFileSync(tmpFile, val, 'utf8');
      const result = firebase(['functions:secrets:set', key, '--data-file', tmpFile]);
      if (result.ok) {
        row(key, `${ok}  set`, '');
        okCount++;
      } else {
        const msg = (result.stdout || result.message || '').split('\n')[0].trim();
        row(key, `${fail}  failed`, msg);
        failCount++;
      }
    } finally {
      try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
    }
  }
  console.log(`\n  ${okCount} set, ${failCount} failed.`);
  if (failCount > 0) process.exitCode = 1;
}

// ── STEP 4 — Deploy ──────────────────────────────────────────
const deployTargets = [
  doRules     && 'firestore:rules',
  doFunctions && 'functions',
  doHosting   && 'hosting',
].filter(Boolean);

if (deployTargets.length > 0) {
  header('Step 4 / Deploy');
  const result = firebase(['deploy', '--only', deployTargets.join(',')]);
  if (result.ok) {
    console.log(`  ${ok}  Deployed: ${deployTargets.join(', ')}`);
  } else {
    console.error(`  ${fail}  Deploy failed:`);
    console.error(`     ${(result.stdout || result.message || '').split('\n')[0]}`);
    process.exitCode = 1;
  }
}

// ── Summary ──────────────────────────────────────────────────
console.log(`\n${c.bold}${c.green}Done.${c.reset}\n`);
