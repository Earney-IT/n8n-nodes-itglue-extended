import { registry, enabledResources } from './index';
import { loadOptions } from '../methods/index';
import { buildResourceProperties } from '../engine/properties';

test('registry has every stable resource and unique names/types', () => {
  const names = registry.map(r => r.name);
  expect(new Set(names).size).toBe(names.length);
  for (const n of ['organization','configuration','password','flexibleAsset','attachment','contact','document','export','relatedItem','user','log']) {
    expect(names).toContain(n);
  }
});
test('every descriptor: non-empty operations, kebab attributes, jsonApiType set', () => {
  for (const r of registry) {
    expect(r.operations.length).toBeGreaterThan(0);
    expect(r.jsonApiType).toBeTruthy();
    for (const f of r.fields) expect(f.attribute).toBe(f.attribute.toLowerCase());
  }
});
test('gated resources excluded from enabledResources by default', () => {
  expect(enabledResources.every(r => !r.gated)).toBe(true);
});

// Extra tests
test('registry has at least 28 resources', () => {
  expect(registry.length).toBeGreaterThanOrEqual(28);
});

test('password descriptor spot-checks', () => {
  const pw = registry.find(r => r.name === 'password');
  expect(pw).toBeDefined();
  expect(pw!.special).toBe('passwords');
  expect(pw!.orgScoped).toBe(true);
  const revealField = pw!.fields.find(f => f.name === 'revealPlaintext');
  expect(revealField).toBeDefined();
  expect(revealField!.default).toBe(false);
  expect(revealField!.attribute).toBe(revealField!.attribute.toLowerCase());
});

test('attachment descriptor has resourceType with passwords option', () => {
  const att = registry.find(r => r.name === 'attachment');
  expect(att).toBeDefined();
  const rtField = att!.fields.find(f => f.name === 'resourceType');
  expect(rtField).toBeDefined();
  const opts = rtField!.options ?? [];
  const vals = opts.map(o => o.value);
  expect(vals).toContain('passwords');
});

test('flexibleAsset has traits json field', () => {
  const fa = registry.find(r => r.name === 'flexibleAsset');
  expect(fa).toBeDefined();
  const traitsField = fa!.fields.find(f => f.name === 'traits');
  expect(traitsField).toBeDefined();
  expect(traitsField!.type).toBe('json');
});

test('document has documentResource options', () => {
  const doc = registry.find(r => r.name === 'document');
  expect(doc).toBeDefined();
  const drField = doc!.fields.find(f => f.name === 'documentResource');
  expect(drField).toBeDefined();
  const opts = drField!.options ?? [];
  const vals = opts.map(o => o.value);
  expect(vals).toContain('document');
  expect(vals).toContain('section');
  expect(vals).toContain('image');
});

test('all field attributes are lowercase (kebab)', () => {
  for (const r of registry) {
    for (const f of r.fields) {
      expect(f.attribute).toBe(f.attribute.toLowerCase());
    }
    for (const f of (r.filters ?? [])) {
      expect(f.attribute).toBe(f.attribute.toLowerCase());
    }
  }
});

test('no duplicate resource names', () => {
  const names = registry.map(r => r.name);
  expect(new Set(names).size).toBe(names.length);
});

test('password has NO explicit passwordId field (auto idParam covers it)', () => {
  const pw = registry.find(r => r.name === 'password');
  const pidField = pw!.fields.find(f => f.name === 'passwordId');
  expect(pidField).toBeUndefined();
  // idParam (passwordId) is auto-emitted for archive/restore/getVersions etc.
  const props = buildResourceProperties(pw!);
  const idProp = props.find(p => p.name === 'passwordId')!;
  expect(idProp).toBeDefined();
  expect(idProp.displayOptions!.show!.operation).toEqual(
    expect.arrayContaining(['get', 'update', 'delete', 'archive', 'restore', 'getVersions']),
  );
  expect(idProp.displayOptions!.show!.operation).not.toContain('getAll');
  expect(idProp.displayOptions!.show!.operation).not.toContain('getVersion');
});

test('relatedItem descriptor has correct special value', () => {
  const ri = registry.find(r => r.name === 'relatedItem');
  expect(ri).toBeDefined();
  expect(ri!.special).toBe('relatedItems');
});

test('export descriptor has createAndWait operation', () => {
  const exp = registry.find(r => r.name === 'export');
  expect(exp).toBeDefined();
  expect(exp!.operations).toContain('createAndWait');
});

test('document descriptor has publish operation', () => {
  const doc = registry.find(r => r.name === 'document');
  expect(doc!.operations).toContain('publish');
});

test('every loadOptionsMethod referenced in the registry exists in methods/index loadOptions', () => {
  for (const r of registry) {
    for (const f of [...r.fields, ...(r.filters ?? [])]) {
      if (f.loadOptionsMethod) {
        expect(Object.prototype.hasOwnProperty.call(loadOptions, f.loadOptionsMethod)).toBe(true);
      }
    }
  }
});

test('every jsonApiType is plural lowercase_underscore and endpoint matches it', () => {
  for (const r of registry) {
    expect(r.jsonApiType).toMatch(/^[a-z][a-z_]*s$/);
    expect(r.endpoint).toBe(r.jsonApiType);
  }
});
