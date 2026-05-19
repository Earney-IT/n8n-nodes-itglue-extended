import { camelToKebab, kebabToCamel, buildJsonApiBody, flattenResource } from './jsonapi';

test('camel/kebab round trip', () => {
  expect(camelToKebab('organizationId')).toBe('organization-id');
  expect(kebabToCamel('organization-id')).toBe('organizationId');
});

test('buildJsonApiBody wraps type + attributes + optional id/relationships', () => {
  expect(buildJsonApiBody('passwords', { name: 'x' }, undefined, '7')).toEqual({
    data: { type: 'passwords', id: '7', attributes: { name: 'x' } },
  });
});

test('flattenResource lifts attributes and keeps id/type/relationships', () => {
  expect(flattenResource({ id: '1', type: 'passwords', attributes: { 'user-name': 'a' }, relationships: { x: 1 } }))
    .toEqual({ id: '1', type: 'passwords', userName: 'a', relationships: { x: 1 } });
});
