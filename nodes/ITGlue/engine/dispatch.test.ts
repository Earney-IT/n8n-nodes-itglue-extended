import { dispatch } from './dispatch';
import { makeCtx } from '../__testutils__/makeCtx';

test('routes generic resource to executeGeneric', async () => {
  const ctx = makeCtx({ params: { resource: 'contactType', operation: 'getAll', returnAll: false, limit: 1 }, httpResponses: [{ data: [] }] });
  const out = await dispatch.call(ctx, 0);
  expect(Array.isArray(out)).toBe(true);
});

test('routes special resource (password) to its handler and redacts in tool ctx', async () => {
  const ctx = makeCtx({ isTool: true, params: { resource: 'password', operation: 'get', passwordId: '3', revealPlaintext: true }, httpResponses: [{ data: { id: '3', type: 'passwords', attributes: { password: 'sek' } } }] });
  const out = await dispatch.call(ctx, 0);
  expect((out[0].json as any).password).toBe('***REDACTED***');
});

test('unknown resource throws', async () => {
  const ctx = makeCtx({ params: { resource: 'nope', operation: 'getAll' } });
  await expect(dispatch.call(ctx, 0)).rejects.toThrow(/Unknown|Unsupported|resource/i);
});

test('routes document publish to documents handler', async () => {
  const ctx = makeCtx({ params: { resource: 'document', operation: 'publish', documentResource: 'document', documentId: '9' }, httpResponses: [{ data: { id: '9', type: 'documents', attributes: { published: true } } }] });
  const out = await dispatch.call(ctx, 0);
  expect((out[0].json as any).id).toBe('9');
});
