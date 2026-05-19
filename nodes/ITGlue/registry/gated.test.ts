import { registry, enabledResources } from './index';

// Post-live-verification state (2026-05-19):
// - sslCertificate, checklist, checklistTemplate, ticket: HTTP 200 → enabled (gated removed)
// - checklistTask: HTTP 401 on top-level endpoint → still gated
// - passwordFolder, networkGlue, copilot: HTTP 404 → dropped from registry entirely

const NEWLY_ENABLED = ['sslCertificate', 'checklist', 'checklistTemplate', 'ticket'];
const STILL_GATED = ['checklistTask'];
const DROPPED = ['passwordFolder', 'networkGlue', 'copilot'];

test('only checklistTask remains gated in registry', () => {
  const gatedInRegistry = registry.filter(r => r.gated);
  expect(gatedInRegistry.map(r => r.name)).toEqual(STILL_GATED);
});

test('checklistTask is in registry with gated:true', () => {
  const d = registry.find(r => r.name === 'checklistTask');
  expect(d).toBeDefined();
  expect(d!.gated).toBe(true);
});

test('checklistTask is NOT in enabledResources', () => {
  const enabledNames = enabledResources.map(r => r.name);
  expect(enabledNames).not.toContain('checklistTask');
});

test('newly enabled resources (sslCertificate/checklist/checklistTemplate/ticket) are in enabledResources', () => {
  const enabledNames = enabledResources.map(r => r.name);
  for (const name of NEWLY_ENABLED) {
    expect(enabledNames).toContain(name);
  }
});

test('newly enabled resources do NOT have gated:true', () => {
  for (const name of NEWLY_ENABLED) {
    const d = registry.find(r => r.name === name);
    expect(d).toBeDefined();
    expect(d!.gated).toBeFalsy();
  }
});

test('dropped resources (passwordFolder/networkGlue/copilot) are NOT in registry at all', () => {
  for (const name of DROPPED) {
    const d = registry.find(r => r.name === name);
    expect(d).toBeUndefined();
  }
});

test('enabledResources = registry minus exactly the gated entries', () => {
  expect(enabledResources.length).toBe(registry.length - STILL_GATED.length);
});

test('checklistTask satisfies registry contract (jsonApiType regex, endpoint match, lowercase attributes)', () => {
  const d = registry.find(r => r.name === 'checklistTask')!;
  expect(d.operations.length).toBeGreaterThan(0);
  expect(d.jsonApiType).toMatch(/^[a-z][a-z_]*s$/);
  expect(d.endpoint).toBe(d.jsonApiType);
  for (const f of d.fields) expect(f.attribute).toBe(f.attribute.toLowerCase());
});
