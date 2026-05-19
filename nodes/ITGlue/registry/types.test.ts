import { ResourceDescriptor, FieldDescriptor, OperationName } from './types';

test('a minimal ResourceDescriptor type-checks and a FieldDescriptor with all optionals compiles', () => {
  const op: OperationName = 'getAll';
  const field: FieldDescriptor = {
    displayName: 'Name', name: 'name', attribute: 'name', type: 'string',
    required: true, default: '', description: 'Description text', loadOptionsMethod: 'getX',
    options: [{ name: 'A', value: 'a' }], onOperations: ['create', 'update'],
    secret: false, password: false,
  };
  const d: ResourceDescriptor = {
    name: 'contactType', displayName: 'Contact Type', jsonApiType: 'contact_types',
    endpoint: 'contact_types', operations: [op, 'get', 'create', 'update'],
    fields: [field],
  };
  expect(d.fields[0].name).toBe('name');
  expect(d.operations).toContain('getAll');
});
