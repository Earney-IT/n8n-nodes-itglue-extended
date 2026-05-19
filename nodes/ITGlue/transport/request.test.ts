import { itGlueApiRequest } from './request';
import { makeCtx } from '../__testutils__/makeCtx';

test('builds single-slash URL and returns body', async () => {
  const ctx = makeCtx({ httpResponses: [{ data: { id: '1' } }] });
  const res = await itGlueApiRequest.call(ctx, 'GET', 'passwords', {}, { a: 1 });
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/passwords');
  expect(ctx._calls[0].qs).toEqual({ a: 1 });
  expect(res).toEqual({ data: { id: '1' } });
});

test('leading slash in resource does not double', async () => {
  const ctx = makeCtx({ httpResponses: [{ data: [] }] });
  await itGlueApiRequest.call(ctx, 'GET', '/passwords');
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/passwords');
});

test('maps 401 to actionable NodeApiError', async () => {
  const ctx = makeCtx();
  ctx.helpers.httpRequestWithAuthentication = async () => { const e: any = new Error('x'); e.response = { status: 401, data: { errors: [{ detail: 'bad key' }] } }; throw e; };
  await expect(itGlueApiRequest.call(ctx, 'GET', 'passwords')).rejects.toThrow(/Authentication failed|bad key/);
});

test('no-response error maps to NodeOperationError message', async () => {
  const ctx = makeCtx();
  ctx.helpers.httpRequestWithAuthentication = async () => { throw new Error('DNS lookup failed'); };
  await expect(itGlueApiRequest.call(ctx, 'GET', 'passwords')).rejects.toThrow(/IT Glue request failed: DNS lookup failed/);
});

test('body is omitted when empty', async () => {
  const ctx = makeCtx({ httpResponses: [{}] });
  await itGlueApiRequest.call(ctx, 'GET', 'passwords', {});
  expect(ctx._calls[0].body).toBeUndefined();
});

test('body is sent when non-empty', async () => {
  const ctx = makeCtx({ httpResponses: [{}] });
  await itGlueApiRequest.call(ctx, 'POST', 'passwords', { data: { type: 'passwords' } });
  expect(ctx._calls[0].body).toEqual({ data: { type: 'passwords' } });
});

test('missing region fails fast with a clear message', async () => {
  const ctx = makeCtx({ credentials: { region: '', apiKey: 'k' } });
  await expect(itGlueApiRequest.call(ctx, 'GET', 'passwords')).rejects.toThrow(/missing the "region" field/);
});
