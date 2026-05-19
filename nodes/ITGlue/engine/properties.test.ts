import { buildResourceProperties } from './properties';
import { ResourceDescriptor } from '../registry/types';

const d: ResourceDescriptor = {
  name: 'contactType', displayName: 'Contact Type', jsonApiType: 'contact_types',
  endpoint: 'contact_types', operations: ['getAll','get','create','update'],
  fields: [{ displayName: 'Name', name: 'name', attribute: 'name', type: 'string', required: true, default: '' }],
};

test('emits operation dropdown scoped to the resource', () => {
  const props = buildResourceProperties(d);
  const op = props.find(p => p.name === 'operation')!;
  expect(op.displayOptions!.show!.resource).toEqual(['contactType']);
  expect((op.options as any[]).map(o => o.value).sort()).toEqual(['create','get','getAll','update']);
});

test('required field shows only for create+update by default', () => {
  const props = buildResourceProperties(d);
  const name = props.find(p => p.name === 'name')!;
  expect(name.displayOptions!.show!.operation).toEqual(['create','update']);
  expect(name.required).toBe(true);
});

test('get/delete add an id param; getAll adds returnAll+limit', () => {
  const props = buildResourceProperties(d);
  expect(props.some(p => p.name === 'contactTypeId')).toBe(true);
  expect(props.some(p => p.name === 'returnAll')).toBe(true);
});
