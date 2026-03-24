// ──────────────────────────────────────────────────────────
// Bem na Mosca — DARIO WOLOSZIN
// https://github.com/dwoloszin
// ──────────────────────────────────────────────────────────
//
// Reads .env.local and uploads every variable as a GitHub
// Actions secret using the VITE_GITHUB_TOKEN already in the file.
//
// Usage:  node scripts/set-github-secrets.cjs
//

const fs      = require('fs');
const path    = require('path');
const https   = require('https');
const sodium  = require('tweetsodium');

// ── 1. Parse .env.local ─────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌  .env.local not found');
  process.exit(1);
}

const envVars = {};
fs.readFileSync(envPath, 'utf8')
  .split('\n')
  .forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx < 1) return;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (key && val) envVars[key] = val;
  });

const TOKEN = envVars['VITE_GITHUB_TOKEN'];
const OWNER = envVars['VITE_GITHUB_OWNER'] || 'dwoloszin';
const REPO  = envVars['VITE_GITHUB_REPO']  || 'PricePilot';

if (!TOKEN || TOKEN === 'REPLACE_WITH_NEW_TOKEN') {
  console.error('❌  VITE_GITHUB_TOKEN is missing or not set in .env.local');
  process.exit(1);
}

console.log(`\n🔐  Uploading secrets to ${OWNER}/${REPO}\n`);

// ── 2. GitHub API helpers ────────────────────────────────────
function ghRequest(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: `/repos/${OWNER}/${REPO}/actions/secrets${endpoint}`,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Accept':        'application/vnd.github+json',
        'User-Agent':    'bem-na-mosca-secrets-script',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function encryptSecret(base64PublicKey, secretValue) {
  const key     = Buffer.from(base64PublicKey, 'base64');
  const message = Buffer.from(secretValue);
  return Buffer.from(sodium.seal(message, key)).toString('base64');
}

// ── 3. Upload all secrets ────────────────────────────────────
async function run() {
  // Get repo public key (required for encryption)
  const { status: pkStatus, body: pk } = await ghRequest('GET', '/public-key');
  if (pkStatus !== 200) {
    console.error(`❌  Could not fetch repo public key (HTTP ${pkStatus})`);
    console.error('    Check that the token has "repo" scope and the repo name is correct.');
    process.exit(1);
  }

  const results = { ok: [], failed: [] };

  for (const [key, value] of Object.entries(envVars)) {
    // Skip the token itself and owner/repo meta — these aren't secrets
    if (['VITE_GITHUB_OWNER', 'VITE_GITHUB_REPO'].includes(key)) continue;

    const encrypted = encryptSecret(pk.key, value);
    const { status } = await ghRequest('PUT', `/${key}`, {
      encrypted_value: encrypted,
      key_id: pk.key_id
    });

    if (status === 201 || status === 204) {
      console.log(`  ✅  ${key}`);
      results.ok.push(key);
    } else {
      console.log(`  ❌  ${key}  (HTTP ${status})`);
      results.failed.push(key);
    }
  }

  console.log(`\n──────────────────────────────────`);
  console.log(`  Done: ${results.ok.length} set, ${results.failed.length} failed`);
  if (results.failed.length > 0) {
    console.log(`  Failed: ${results.failed.join(', ')}`);
    process.exit(1);
  }
  console.log(`\n  Push to main to trigger deployment:`);
  console.log(`  git push\n`);
}

run().catch(err => { console.error('❌ Unexpected error:', err.message); process.exit(1); });
