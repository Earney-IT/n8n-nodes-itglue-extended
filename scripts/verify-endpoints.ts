/**
 * IT Glue API endpoint live-verification script (Task 19 Part B).
 *
 * Usage:
 *   ITGLUE_API_KEY=<your-key> npx ts-node scripts/verify-endpoints.ts
 *   ITGLUE_API_KEY=<your-key> ITGLUE_REGION=api.eu npx ts-node scripts/verify-endpoints.ts
 *
 * This script is NOT part of the node build (scripts/ is outside tsconfig include).
 * Run it manually to confirm gated endpoints before flipping gated:false on each descriptor.
 *
 * SECURITY:
 *   - Reads API key from environment only — never hardcoded, never logged.
 *   - All requests are read-only GETs (page[size]=1).
 *   - Attribute KEYS are printed for inspection; attribute VALUES are never printed
 *     (avoids leaking password/secret values from sample data).
 */

const KEY = process.env.ITGLUE_API_KEY;
const REGION = process.env.ITGLUE_REGION || 'api';
const BASE = `https://${REGION}.itglue.com`;

if (!KEY) {
  console.error('ERROR: set ITGLUE_API_KEY env var');
  process.exit(1);
}

const HEADERS: Record<string, string> = {
  'x-api-key': KEY,
  'Content-Type': 'application/vnd.api+json',
  'Accept': 'application/json',
};

// ── helpers ──────────────────────────────────────────────────────────────────

async function probe(path: string): Promise<void> {
  const url = `${BASE}/${path}?page[size]=1`;
  try {
    const res = await fetch(url, { method: 'GET', headers: HEADERS });
    if (res.status === 200) {
      console.log(`EXISTS  ${path}  (HTTP ${res.status})`);
    } else if (res.status === 404 || res.status === 403 || res.status === 400) {
      console.log(`MISSING ${path} (HTTP ${res.status})`);
    } else {
      console.log(`??      ${path} (HTTP ${res.status})`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`ERROR   ${path} ${msg}`);
  }
}

/**
 * Fetch a single-page list and print the attribute KEY NAMES of the first record.
 * Values are intentionally never printed to avoid leaking secrets.
 */
async function dumpAttributeKeys(path: string, extraQuery = ''): Promise<void> {
  const url = `${BASE}/${path}?page[size]=1${extraQuery ? `&${extraQuery}` : ''}`;
  console.log(`\n--- Attribute key inspection: ${path} ---`);
  try {
    const res = await fetch(url, { method: 'GET', headers: HEADERS });
    const status = res.status;
    if (status !== 200) {
      console.log(`  (HTTP ${status} — skipping key dump)`);
      return;
    }
    const body = await res.json() as {
      data?: Array<{ attributes?: Record<string, unknown> }>;
    };
    const first = body?.data?.[0];
    if (!first) {
      console.log('  (no records returned — cannot inspect keys)');
      return;
    }
    const attrs = first.attributes ?? {};
    const keys = Object.keys(attrs);
    console.log(`  attribute keys (${keys.length}): ${JSON.stringify(keys)}`);
    // For exports only: also print the 'status' VALUE (not a secret) to confirm casing
    if (path.startsWith('exports')) {
      const statusVal = attrs['status'];
      console.log(`  exports[0].attributes.status VALUE = ${JSON.stringify(statusVal)}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ERROR dumping keys: ${msg}`);
  }
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`IT Glue endpoint verifier — base: ${BASE}`);
  console.log('(API key read from env, never logged)\n');

  // ── Gated endpoint probes ──
  console.log('=== Gated endpoint probes ===');
  const gatedEndpoints = [
    'password_folders',
    'ssl_certificates',
    'checklists',
    'checklist_tasks',
    'checklist_templates',
    'tickets',
    'networks',
    'copilots',
  ];
  for (const ep of gatedEndpoints) {
    await probe(ep);
  }

  // ── Security follow-up: attribute key dumps ──
  console.log('\n=== Security follow-up: attribute key inspection ===');
  console.log('(Only KEY NAMES are printed — values are never shown to avoid secret leakage)');

  // 1. Passwords attributes — confirm redaction allowlist covers all keys
  //    show_password=false so the plaintext value is not included in the response
  await dumpAttributeKeys('passwords', 'show_password=false');

  // 2. Password versions — confirm secret field name for F1 stripVersionSecrets denylist
  await dumpAttributeKeys('password_versions');

  // 3. Exports — confirm 'status' field casing ('Complete' vs 'completed') and 'download-url' key
  await dumpAttributeKeys('exports');

  // ── Summary ──
  console.log('\n=== Summary ===');
  console.log('Review EXISTS/MISSING lines above.');
  console.log('For EXISTS endpoints: flip gated:false on the descriptor.');
  console.log('For MISSING endpoints: remove or keep gated (do not ship to enabledResources).');
  console.log('For attribute key dumps: update redaction allowlists/denylists as needed.');
  console.log('\nDone.');
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`Fatal error: ${msg}`);
  process.exit(1);
});
