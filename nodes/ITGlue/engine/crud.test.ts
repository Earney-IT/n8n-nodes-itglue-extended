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

const orgScopedDescriptor: ResourceDescriptor = {
  name: 'configuration', displayName: 'Configuration', jsonApiType: 'configurations',
  endpoint: 'configurations', operations: ['getAll','create'], orgScoped: true,
  fields: [{ name: 'name', attribute: 'name', displayName: 'Name', type: 'string', required: true }],
};
const filterDescriptor: ResourceDescriptor = {
  name: 'configuration', displayName: 'Configuration', jsonApiType: 'configurations',
  endpoint: 'configurations', operations: ['getAll'], fields: [],
  filters: [{ name: 'filterName', attribute: 'filter-name', displayName: 'Filter Name', type: 'string' }],
  includes: ['organization'],
};

test('org-scoped create routes to organizations/<orgId>/relationships/<endpoint>', async () => {
  const ctx = makeCtx({ params: { operation: 'create', organizationId: '42', name: 'Test Config' }, httpResponses: [{ data: { id: '1', type: 'configurations', attributes: { name: 'Test Config' } } }] });
  await executeGeneric.call(ctx, orgScopedDescriptor, 0);
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/organizations/42/relationships/configurations');
  expect(ctx._calls[0].method).toBe('POST');
});

test('update sends PATCH /<endpoint>/<id> with JSON:API body containing the id', async () => {
  const ctx = makeCtx({ params: { operation: 'update', contactTypeId: '7', name: 'Updated' }, httpResponses: [{ data: { id: '7', type: 'contact_types', attributes: { name: 'Updated' } } }] });
  await executeGeneric.call(ctx, d, 0);
  expect(ctx._calls[0].method).toBe('PATCH');
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/contact_types/7');
  expect(ctx._calls[0].body).toEqual({ data: { type: 'contact_types', id: '7', attributes: { name: 'Updated' } } });
});

test('getAll applies filter[attr], include, and page[size] from limit', async () => {
  const ctx = makeCtx({ params: { operation: 'getAll', returnAll: false, limit: 25, filters: { filterName: 'web' }, include: ['organization'] }, httpResponses: [{ data: [{ id: '1', type: 'configurations', attributes: {} }] }] });
  await executeGeneric.call(ctx, filterDescriptor, 0);
  const qs = ctx._calls[0].qs;
  expect(qs['filter[filter-name]']).toBe('web');
  expect(qs['include']).toBe('organization');
  expect(qs['page[size]']).toBe(25);
});

test('bulkDelete sends DELETE with id array body and returns success', async () => {
  const bulkD: ResourceDescriptor = { ...d, operations: ['bulkDelete'] };
  const ctx = makeCtx({ params: { operation: 'bulkDelete', bulkIds: ['10','11','12'] }, httpResponses: [{}] });
  const out = await executeGeneric.call(ctx, bulkD, 0);
  expect(ctx._calls[0].method).toBe('DELETE');
  expect(ctx._calls[0].body).toEqual({ data: [ { type:'contact_types', id:'10' }, { type:'contact_types', id:'11' }, { type:'contact_types', id:'12' } ] });
  expect(out[0].json).toEqual({ success: true, deleted: ['10','11','12'] });
});

test('get throws descriptive error when id param is missing', async () => {
  const ctx = makeCtx({ params: { operation: 'get' }, httpResponses: [{ data: { id: '5', type: 'contact_types', attributes: {} } }] });
  await expect(executeGeneric.call(ctx, d, 0)).rejects.toThrow(/contactTypeId.*required|required.*contactTypeId/i);
});

test('bulkUpdate sends data array and rejects empty', async () => {
  const dd = { ...d, operations: ['bulkUpdate'] as any };
  const ok = makeCtx({ params: { operation: 'bulkUpdate', bulkItems: [{ id: '1', name: 'A' }] }, httpResponses: [{ data: [{ id:'1', type:'contact_types', attributes:{name:'A'} }] }] });
  await executeGeneric.call(ok, dd, 0);
  expect(ok._calls[0].method).toBe('PATCH');
  expect(ok._calls[0].body).toEqual({ data: [{ type:'contact_types', id:'1', attributes:{ name:'A' } }] });
  const bad = makeCtx({ params: { operation: 'bulkUpdate', bulkItems: [] } });
  await expect(executeGeneric.call(bad, dd, 0)).rejects.toThrow(/non-empty/);
  const noId = makeCtx({ params: { operation: 'bulkUpdate', bulkItems: [{ name: 'X' }] } });
  await expect(executeGeneric.call(noId, dd, 0)).rejects.toThrow(/missing "id"/);
});

test('bulkDelete sends id array, parses JSON string, rejects empty', async () => {
  const dd = { ...d, operations: ['bulkDelete'] as any };
  const ok = makeCtx({ params: { operation: 'bulkDelete', bulkIds: '["7","8"]' }, httpResponses: [{}] });
  const out = await executeGeneric.call(ok, dd, 0);
  expect(ok._calls[0].method).toBe('DELETE');
  expect(ok._calls[0].body).toEqual({ data: [{ type:'contact_types', id:'7' }, { type:'contact_types', id:'8' }] });
  expect(out[0].json).toEqual({ success: true, deleted: ['7','8'] });
  const bad = makeCtx({ params: { operation: 'bulkDelete', bulkIds: [] } });
  await expect(executeGeneric.call(bad, dd, 0)).rejects.toThrow(/non-empty/);
});
