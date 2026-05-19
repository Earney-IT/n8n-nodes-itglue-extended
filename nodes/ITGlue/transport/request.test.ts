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

test('retries once on 429 then succeeds', async () => {
  const ctx = makeCtx();
  let n = 0;
  ctx.helpers.httpRequestWithAuthentication = async () => {
    if (n++ === 0) { const e: any = new Error('rl'); e.response = { status: 429, headers: { 'retry-after': '0' } }; throw e; }
    return { data: [{ id: '1' }] };
  };
  const { itGlueApiRequest } = require('./request');
  const res = await itGlueApiRequest.call(ctx, 'GET', 'passwords');
  expect(res).toEqual({ data: [{ id: '1' }] });
  expect(n).toBe(2);
});

test('apiRequestAllItems aggregates pages and stops on short page', async () => {
  const page1 = { data: Array.from({ length: 1000 }, (_, i) => ({ id: String(i) })) };
  const page2 = { data: [{ id: '1000' }] };
  const ctx = makeCtx({ httpResponses: [page1, page2] });
  const { itGlueApiRequestAllItems } = require('./request');
  const all = await itGlueApiRequestAllItems.call(ctx, 'GET', 'passwords');
  expect(all).toHaveLength(1001);
});

test('apiRequestAllItems throws after MAX_PAGES pages', async () => {
  const ctx = makeCtx();
  const fullPage = Array.from({ length: 1000 }, (_, i) => ({ id: String(i) }));
  ctx.helpers.httpRequestWithAuthentication = async () => ({ data: fullPage });
  const { itGlueApiRequestAllItems } = require('./request');
  await expect(itGlueApiRequestAllItems.call(ctx, 'GET', 'passwords')).rejects.toThrow(/more than 200 pages/);
});

test('apiRequestAllItems does not mutate caller qs', async () => {
  const ctx = makeCtx({ httpResponses: [{ data: [{ id: '0' }] }] });
  const { itGlueApiRequestAllItems } = require('./request');
  const qs: Record<string, unknown> = { filter: 'x' };
  await itGlueApiRequestAllItems.call(ctx, 'GET', 'passwords', {}, qs);
  expect(qs).not.toHaveProperty('page[number]');
  expect(qs).not.toHaveProperty('page[size]');
});

test('apiRequestAllItems throws NodeOperationError when data is not an array', async () => {
  const ctx = makeCtx({ httpResponses: [{ data: { id: '1' } }] });
  const { itGlueApiRequestAllItems } = require('./request');
  await expect(itGlueApiRequestAllItems.call(ctx, 'GET', 'organizations/1')).rejects.toThrow(/expected an array/);
});
