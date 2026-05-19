import { withRetry } from './rateLimit';

test('returns result when fn succeeds first try', async () => {
  const r = await withRetry(async () => 'ok', { retries: 3, sleep: async () => {} });
  expect(r).toBe('ok');
});

test('retries on 429 up to `retries` then rethrows', async () => {
  let calls = 0;
  const make429 = () => { const e: any = new Error('rl'); e.response = { status: 429, headers: {} }; return e; };
  await expect(withRetry(async () => { calls++; throw make429(); }, { retries: 2, sleep: async () => {} }))
    .rejects.toMatchObject({ response: { status: 429 } });
  expect(calls).toBe(3); // initial + 2 retries
});

test('does not retry non-429 errors', async () => {
  let calls = 0;
  await expect(withRetry(async () => { calls++; const e: any = new Error('boom'); e.response = { status: 500 }; throw e; }, { retries: 3, sleep: async () => {} }))
    .rejects.toThrow('boom');
  expect(calls).toBe(1);
});

test('honors Retry-After header (seconds) for the delay', async () => {
  const delays: number[] = [];
  let calls = 0;
  const fn = async () => { if (calls++ === 0) { const e: any = new Error('rl'); e.response = { status: 429, headers: { 'retry-after': '2' } }; throw e; } return 'done'; };
  const r = await withRetry(fn, { retries: 3, sleep: async (ms: number) => { delays.push(ms); } });
  expect(r).toBe('done');
  expect(delays[0]).toBe(2000);
});

test('uses exponential backoff when Retry-After header is absent', async () => {
  const delays: number[] = [];
  let calls = 0;
  const fn = async () => { if (calls++ < 2) { const e: any = new Error('rl'); e.response = { status: 429, headers: {} }; throw e; } return 'done'; };
  await withRetry(fn, { retries: 3, sleep: async (ms: number) => { delays.push(ms); } });
  expect(delays).toEqual([1000, 2000]);
});

test('caps an absurd Retry-After at 60s', async () => {
  const delays: number[] = [];
  let calls = 0;
  const fn = async () => { if (calls++ === 0) { const e: any = new Error('rl'); e.response = { status: 429, headers: { 'retry-after': '86400' } }; throw e; } return 'ok'; };
  await withRetry(fn, { retries: 2, sleep: async (ms: number) => { delays.push(ms); } });
  expect(delays[0]).toBe(60000);
});
