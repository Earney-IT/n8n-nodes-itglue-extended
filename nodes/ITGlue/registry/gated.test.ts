import { registry, enabledResources } from './index';

const GATED = ['passwordFolder','sslCertificate','checklist','checklistTask','checklistTemplate','ticket','networkGlue','copilot'];

test('all 8 gated descriptors exist in registry with gated:true', () => {
  for (const name of GATED) {
    const d = registry.find(r => r.name === name);
    expect(d).toBeDefined();
    expect(d!.gated).toBe(true);
  }
});
test('gated descriptors are excluded from enabledResources', () => {
  const enabledNames = enabledResources.map(r => r.name);
  for (const name of GATED) expect(enabledNames).not.toContain(name);
});
test('every gated descriptor still satisfies the registry contract', () => {
  for (const name of GATED) {
    const d = registry.find(r => r.name === name)!;
    expect(d.operations.length).toBeGreaterThan(0);
    expect(d.jsonApiType).toMatch(/^[a-z][a-z_]*s$/);
    expect(d.endpoint).toBe(d.jsonApiType);
    for (const f of d.fields) expect(f.attribute).toBe(f.attribute.toLowerCase());
  }
});
