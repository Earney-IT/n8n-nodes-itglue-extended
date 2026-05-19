import { executeExport } from './exports';
import { makeCtx } from '../../__testutils__/makeCtx';

// ---- required tests from spec ----

test('create posts an export job', async () => {
  const ctx = makeCtx({ params: { operation: 'create', format: 'CSV' }, httpResponses: [{ data: { id: 'e1', type: 'exports', attributes: { status: 'pending' } } }] });
  const out = await executeExport.call(ctx, 0);
  expect(ctx._calls[0].method).toBe('POST');
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/exports');
  expect((out[0].json as any).id).toBe('e1');
});

test('get fetches export by id', async () => {
  const ctx = makeCtx({ params: { operation: 'get', exportId: 'e1' }, httpResponses: [{ data: { id: 'e1', type: 'exports', attributes: { status: 'completed' } } }] });
  await executeExport.call(ctx, 0);
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/exports/e1');
});

test('createAndWait polls until completed', async () => {
  const ctx = makeCtx({ params: { operation: 'createAndWait', format: 'CSV' }, httpResponses: [
    { data: { id: 'e9', type: 'exports', attributes: { status: 'pending' } } },
    { data: { id: 'e9', type: 'exports', attributes: { status: 'pending' } } },
    { data: { id: 'e9', type: 'exports', attributes: { status: 'completed', 'download-url': 'http://x/f.csv' } } },
  ]});
  const out = await executeExport.call(ctx, 0, { sleep: async () => {} });
  expect((out[0].json as any).status).toBe('completed');
  expect((out[0].json as any).downloadUrl).toBe('http://x/f.csv');
});

// ---- extra tests ----

test('getAll without returnAll uses page size limit', async () => {
  const ctx = makeCtx({ params: { operation: 'getAll', returnAll: false, limit: 10 }, httpResponses: [{ data: [] }] });
  await executeExport.call(ctx, 0);
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/exports');
  expect(ctx._calls[0].qs['page[size]']).toBe(10);
});

test('getAll returnAll=true uses itGlueApiRequestAllItems path', async () => {
  const ctx = makeCtx({ params: { operation: 'getAll', returnAll: true }, httpResponses: [{ data: [{ id: 'e1', type: 'exports', attributes: { status: 'completed' } }] }] });
  const out = await executeExport.call(ctx, 0);
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/exports');
  expect((out[0].json as any).id).toBe('e1');
});

test('delete sends DELETE and returns success', async () => {
  const ctx = makeCtx({ params: { operation: 'delete', exportId: 'e5' }, httpResponses: [{}] });
  const out = await executeExport.call(ctx, 0);
  expect(ctx._calls[0].method).toBe('DELETE');
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/exports/e5');
  expect((out[0].json as any).success).toBe(true);
  expect((out[0].json as any).id).toBe('e5');
});

test('createAndWait with immediate completed status returns right away', async () => {
  const ctx = makeCtx({ params: { operation: 'createAndWait', format: 'PDF' }, httpResponses: [
    { data: { id: 'e10', type: 'exports', attributes: { status: 'completed', 'download-url': 'http://x/f.pdf' } } },
  ]});
  const out = await executeExport.call(ctx, 0, { sleep: async () => {} });
  expect(ctx._calls).toHaveLength(1); // only the POST, no poll
  expect((out[0].json as any).downloadUrl).toBe('http://x/f.pdf');
});

test('createAndWait with failed status throws NodeOperationError', async () => {
  const ctx = makeCtx({ params: { operation: 'createAndWait', format: 'CSV' }, httpResponses: [
    { data: { id: 'e11', type: 'exports', attributes: { status: 'pending' } } },
    { data: { id: 'e11', type: 'exports', attributes: { status: 'failed' } } },
  ]});
  await expect(executeExport.call(ctx, 0, { sleep: async () => {} })).rejects.toThrow(/failed/i);
});

test('createAndWait poll cap throws after max polls', async () => {
  // Queue 1 create + 61 pending polls (> cap of 60)
  const responses = [
    { data: { id: 'ecap', type: 'exports', attributes: { status: 'pending' } } },
    ...Array.from({ length: 61 }, () => ({ data: { id: 'ecap', type: 'exports', attributes: { status: 'pending' } } })),
  ];
  const ctx = makeCtx({ params: { operation: 'createAndWait', format: 'CSV' }, httpResponses: responses });
  await expect(executeExport.call(ctx, 0, { sleep: async () => {} })).rejects.toThrow(/did not complete after/i);
});

test('create with optional resource-type and resource-id', async () => {
  const ctx = makeCtx({ params: { operation: 'create', format: 'CSV', resourceType: 'organizations', resourceId: '5' }, httpResponses: [{ data: { id: 'e2', type: 'exports', attributes: { status: 'pending' } } }] });
  await executeExport.call(ctx, 0);
  expect(ctx._calls[0].body.data.attributes['resource-type']).toBe('organizations');
  expect(ctx._calls[0].body.data.attributes['resource-id']).toBe('5');
});

test('get missing exportId throws', async () => {
  const ctx = makeCtx({ params: { operation: 'get' } });
  await expect(executeExport.call(ctx, 0)).rejects.toThrow('"exportId" is required');
});

test('delete missing exportId throws', async () => {
  const ctx = makeCtx({ params: { operation: 'delete' } });
  await expect(executeExport.call(ctx, 0)).rejects.toThrow('"exportId" is required');
});
