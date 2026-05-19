import { executeRelatedItem } from './relatedItems';
import { makeCtx } from '../../__testutils__/makeCtx';

// ---- required tests from spec ----

test('create posts to parent relationship route with destination', async () => {
  const ctx = makeCtx({ params: { operation: 'create', resourceType: 'configurations', resourceId: '7', destinationId: '42', destinationType: 'Password' },
    httpResponses: [{ data: { id: 'ri1', type: 'related_items', attributes: {} } }] });
  const out = await executeRelatedItem.call(ctx, 0);
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/configurations/7/relationships/related_items');
  expect(ctx._calls[0].method).toBe('POST');
  expect(ctx._calls[0].body.data.attributes['destination-id']).toBe('42');
  expect(ctx._calls[0].body.data.attributes['destination-type']).toBe('Password');
  expect((out[0].json as any).id).toBe('ri1');
});

test('bulkDelete sends DELETE with id array body', async () => {
  const ctx = makeCtx({ params: { operation: 'bulkDelete', resourceType: 'configurations', resourceId: '7', relatedItemIds: ['1','2'] }, httpResponses: [{}] });
  const out = await executeRelatedItem.call(ctx, 0);
  expect(ctx._calls[0].method).toBe('DELETE');
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/configurations/7/relationships/related_items');
  expect(ctx._calls[0].body.data).toEqual([{ type: 'related_items', id: '1' }, { type: 'related_items', id: '2' }]);
  expect(out[0].json).toEqual({ success: true, deleted: ['1','2'] });
});

// ---- extra tests ----

test('create with optional notes includes notes attribute', async () => {
  const ctx = makeCtx({ params: { operation: 'create', resourceType: 'passwords', resourceId: '3', destinationId: '99', destinationType: 'Configuration', notes: 'See ticket #42' },
    httpResponses: [{ data: { id: 'ri2', type: 'related_items', attributes: { notes: 'See ticket #42' } } }] });
  const out = await executeRelatedItem.call(ctx, 0);
  expect(ctx._calls[0].body.data.attributes.notes).toBe('See ticket #42');
  expect((out[0].json as any).notes).toBe('See ticket #42');
});

test('update sends PATCH to base/<id> with notes', async () => {
  const ctx = makeCtx({ params: { operation: 'update', resourceType: 'configurations', resourceId: '7', relatedItemId: 'ri5', notes: 'Updated note' },
    httpResponses: [{ data: { id: 'ri5', type: 'related_items', attributes: { notes: 'Updated note' } } }] });
  const out = await executeRelatedItem.call(ctx, 0);
  expect(ctx._calls[0].method).toBe('PATCH');
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/configurations/7/relationships/related_items/ri5');
  expect(ctx._calls[0].body.data.id).toBe('ri5');
  expect(ctx._calls[0].body.data.attributes.notes).toBe('Updated note');
  expect((out[0].json as any).id).toBe('ri5');
});

test('update without notes sends empty attributes', async () => {
  const ctx = makeCtx({ params: { operation: 'update', resourceType: 'configurations', resourceId: '7', relatedItemId: 'ri6' },
    httpResponses: [{ data: { id: 'ri6', type: 'related_items', attributes: {} } }] });
  await executeRelatedItem.call(ctx, 0);
  expect(ctx._calls[0].body.data.attributes).toEqual({});
});

test('bulkDelete with empty ids throws', async () => {
  const ctx = makeCtx({ params: { operation: 'bulkDelete', resourceType: 'configurations', resourceId: '7', relatedItemIds: [] } });
  await expect(executeRelatedItem.call(ctx, 0)).rejects.toThrow(/at least one ID/);
});

test('create missing destinationId throws', async () => {
  const ctx = makeCtx({ params: { operation: 'create', resourceType: 'configurations', resourceId: '7', destinationType: 'Password' } });
  await expect(executeRelatedItem.call(ctx, 0)).rejects.toThrow('"destinationId" is required');
});

test('create missing destinationType throws', async () => {
  const ctx = makeCtx({ params: { operation: 'create', resourceType: 'configurations', resourceId: '7', destinationId: '42' } });
  await expect(executeRelatedItem.call(ctx, 0)).rejects.toThrow('"destinationType" is required');
});

test('missing resourceType throws', async () => {
  const ctx = makeCtx({ params: { operation: 'create', resourceId: '7', destinationId: '42', destinationType: 'Password' } });
  await expect(executeRelatedItem.call(ctx, 0)).rejects.toThrow('"resourceType" is required');
});

test('missing resourceId throws', async () => {
  const ctx = makeCtx({ params: { operation: 'create', resourceType: 'configurations', destinationId: '42', destinationType: 'Password' } });
  await expect(executeRelatedItem.call(ctx, 0)).rejects.toThrow('"resourceId" is required');
});

test('update missing relatedItemId throws', async () => {
  const ctx = makeCtx({ params: { operation: 'update', resourceType: 'configurations', resourceId: '7' } });
  await expect(executeRelatedItem.call(ctx, 0)).rejects.toThrow('"relatedItemId" is required');
});
