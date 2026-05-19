import { buildResourceProperties } from './properties';
import { ResourceDescriptor } from '../registry/types';

const d: ResourceDescriptor = {
  name: 'contactType', displayName: 'Contact Type', jsonApiType: 'contact_types',
  endpoint: 'contact_types', operations: ['getAll', 'get', 'create', 'update'],
  fields: [{ name: 'name', attribute: 'name', displayName: 'Name', type: 'string', required: true }],
};

test('emits operation dropdown scoped to the resource', () => {
  const props = buildResourceProperties(d);
  const op = props.find(p => p.name === 'operation')!;
  expect(op.displayOptions!.show!.resource).toEqual(['contactType']);
  expect((op.options as any[]).map(o => o.value).sort()).toEqual(['create', 'get', 'getAll', 'update']);
});

test('required field shows only for create+update by default', () => {
  const props = buildResourceProperties(d);
  const name = props.find(p => p.name === 'name')!;
  expect(name.displayOptions!.show!.operation).toEqual(['create', 'update']);
  expect(name.required).toBe(true);
});

test('get/delete add an id param; getAll adds returnAll+limit', () => {
  const props = buildResourceProperties(d);
  expect(props.some(p => p.name === 'contactTypeId')).toBe(true);
  expect(props.some(p => p.name === 'returnAll')).toBe(true);
});

test('include emitted for get-only resource, title-cased', () => {
  const getOnly: ResourceDescriptor = {
    name: 'contactType', displayName: 'Contact Type', jsonApiType: 'contact_types', endpoint: 'contact_types',
    operations: ['get'], fields: [], includes: ['recent_versions', 'organization'],
  };
  const props = buildResourceProperties(getOnly);
  const inc = props.find(p => p.name === 'include')!;
  expect(inc).toBeDefined();
  expect(inc.displayOptions!.show!.operation).toContain('get');
  const names = (inc.options as any[]).map(o => o.name);
  expect(names).toContain('Organization');
  expect(names).toContain('Recent Versions');
});

test('empty operations throws', () => {
  expect(() => buildResourceProperties({
    name: 'x', displayName: 'X', jsonApiType: 'xs', endpoint: 'xs', operations: [], fields: [],
  })).toThrow(/no operations/);
});

test('password + loadOptions field shapes; orgScoped create-only', () => {
  const d2: ResourceDescriptor = {
    name: 'pw', displayName: 'Password', jsonApiType: 'passwords', endpoint: 'passwords',
    operations: ['create'], orgScoped: true,
    fields: [
      { displayName: 'Category', name: 'category', attribute: 'password-category-id', type: 'options', loadOptionsMethod: 'getPasswordCategories', default: '' },
      { displayName: 'Password', name: 'password', attribute: 'password', type: 'string', password: true, default: '' },
    ],
  };
  const props = buildResourceProperties(d2);
  expect((props.find(p => p.name === 'category') as any).typeOptions.loadOptionsMethod).toBe('getPasswordCategories');
  expect((props.find(p => p.name === 'password') as any).typeOptions.password).toBe(true);
  const org = props.find(p => p.name === 'organizationId')!;
  expect(org.displayOptions!.show!.operation).toContain('create');
});
