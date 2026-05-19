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

test('multi-hump name round-trips correctly', () => {
  expect(camelToKebab('flexibleAssetTypeId')).toBe('flexible-asset-type-id');
  expect(kebabToCamel('flexible-asset-type-id')).toBe('flexibleAssetTypeId');
});

test('flattenResource with no attributes does not throw', () => {
  expect(flattenResource({ id: '5', type: 'organizations' }))
    .toEqual({ id: '5', type: 'organizations' });
});

test('flattenResource: real resource id wins over a colliding attribute', () => {
  expect(flattenResource({ id: '1', type: 'passwords', attributes: { id: '999', type: 'evil' } }))
    .toEqual({ id: '1', type: 'passwords' });
});
