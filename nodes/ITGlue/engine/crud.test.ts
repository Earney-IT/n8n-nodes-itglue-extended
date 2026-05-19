import { executeGeneric } from './crud';
import { makeCtx } from '../__testutils__/makeCtx';
import { ResourceDescriptor } from '../registry/types';

const d: ResourceDescriptor = {
  name: 'contactType', displayName: 'Contact Type', jsonApiType: 'contact_types',
  endpoint: 'contact_types', operations: ['getAll','get','create','update','delete'],
  fields: [{ name: 'name', attribute: 'name', displayName: 'Name', type: 'string', required: true }],
};

test('create builds JSON:API POST body and returns flattened', async () => {
  const ctx = makeCtx({ params: { operation: 'create', name: 'VIP' }, httpResponses: [{ data: { id: '9', type: 'contact_types', attributes: { name: 'VIP' } } }] });
  const out = await executeGeneric.call(ctx, d, 0);
  expect(ctx._calls[0].method).toBe('POST');
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/contact_types');
  expect(ctx._calls[0].body).toEqual({ data: { type: 'contact_types', attributes: { name: 'VIP' } } });
  expect(out[0].json).toEqual({ id: '9', type: 'contact_types', name: 'VIP' });
});

test('get hits /<endpoint>/<id>', async () => {
  const ctx = makeCtx({ params: { operation: 'get', contactTypeId: '5' }, httpResponses: [{ data: { id: '5', type: 'contact_types', attributes: {} } }] });
  await executeGeneric.call(ctx, d, 0);
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/contact_types/5');
});

test('delete issues DELETE and returns {success:true,id}', async () => {
  const ctx = makeCtx({ params: { operation: 'delete', contactTypeId: '5' }, httpResponses: [{}] });
  const out = await executeGeneric.call(ctx, d, 0);
  expect(ctx._calls[0].method).toBe('DELETE');
  expect(out[0].json).toEqual({ success: true, id: '5' });
});
