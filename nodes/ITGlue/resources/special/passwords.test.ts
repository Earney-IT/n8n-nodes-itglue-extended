import { executePassword } from './passwords';
import { makeCtx } from '../../__testutils__/makeCtx';
import { REDACTED } from '../../engine/redact';

const respGet = { data: { id: '3', type: 'passwords', attributes: { name: 'VPN', password: 'topsecret' } } };

test('get-by-id NEVER sends show_password in tool context and redacts', async () => {
  const ctx = makeCtx({ isTool: true, params: { operation: 'get', passwordId: '3', revealPlaintext: true }, httpResponses: [respGet] });
  const out = await executePassword.call(ctx, 0);
  expect(ctx._calls[0].qs?.show_password).toBeUndefined();
  expect((out[0].json as any).password).toBe(REDACTED);
  expect((out[0].json as any)._passwordRedactedReason).toMatch(/AI\/tool/);
});

test('get-by-id reveals only in manual + revealPlaintext true', async () => {
  const ctx = makeCtx({ mode: 'manual', params: { operation: 'get', passwordId: '3', revealPlaintext: true }, httpResponses: [respGet] });
  const out = await executePassword.call(ctx, 0);
  expect(ctx._calls[0].qs.show_password).toBe(true);
  expect((out[0].json as any).password).toBe('topsecret');
  expect((out[0].json as any)._passwordRevealed).toBe(true);
});

test('create echoes are redacted even in manual unless reveal succeeded', async () => {
  const ctx = makeCtx({ mode: 'manual', params: { operation: 'create', organizationId: '1', name: 'VPN', password: 'p', revealPlaintext: false },
    httpResponses: [{ data: { id: '4', type: 'passwords', attributes: { name: 'VPN', password: 'p' } } }] });
  const out = await executePassword.call(ctx, 0);
  expect(ctx._calls[0].body.data.attributes.password).toBe('p');
  expect((out[0].json as any).password).toBe(REDACTED);
});

test('getAll never reveals (bulk) regardless of toggle', async () => {
  const ctx = makeCtx({ mode: 'manual', params: { operation: 'getAll', returnAll: false, limit: 2, revealPlaintext: true },
    httpResponses: [{ data: [{ id: '1', type: 'passwords', attributes: { password: 'a' } }] }] });
  const out = await executePassword.call(ctx, 0);
  expect(ctx._calls[0].qs.show_password).toBeUndefined();
  expect((out[0].json as any).password).toBe(REDACTED);
});

test('getVersions returns redacted version list', async () => {
  const ctx = makeCtx({ mode: 'manual', params: { operation: 'getVersions', passwordId: '3', revealPlaintext: true },
    httpResponses: [{ data: [{ id: 'v1', type: 'password_versions', attributes: { password: 'old' } }] }] });
  const out = await executePassword.call(ctx, 0);
  expect((out[0].json as any).password).toBe(REDACTED);
});

test('SECURITY: official tool signal blocks reveal even under safe ambient mode', async () => {
  const ctx = makeCtx({ mode: 'manual', params: { operation: 'get', passwordId: '3', revealPlaintext: true }, httpResponses: [respGet] });
  ctx.isToolExecution = () => true; // real n8n AI-tool signal; ambient mode looks safe
  const out = await executePassword.call(ctx, 0);
  expect(ctx._calls[0].qs?.show_password).toBeUndefined();
  expect((out[0].json as any).password).toBe(REDACTED);
  expect((out[0].json as any)._passwordRedactedReason).toMatch(/AI\/tool/);
});

test('backstop: reveal forced off if isToolExecution method is absent (old runtime)', async () => {
  const ctx = makeCtx({ mode: 'manual', params: { operation: 'get', passwordId: '3', revealPlaintext: true }, httpResponses: [respGet] });
  delete ctx.isToolExecution;
  const out = await executePassword.call(ctx, 0);
  expect(ctx._calls[0].qs?.show_password).toBeUndefined();
  expect((out[0].json as any).password).toBe(REDACTED);
});
