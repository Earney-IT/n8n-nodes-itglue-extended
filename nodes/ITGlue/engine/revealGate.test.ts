import { isToolExecution, canRevealPlaintext } from './revealGate';
import { makeCtx } from '../__testutils__/makeCtx';

// ─── Required 7 tests ────────────────────────────────────────────────────────

test('tool invocation is detected', () => {
  expect(isToolExecution(makeCtx({ isTool: true }))).toBe(true);
});
test('unknown/blank mode fails closed (treated as tool)', () => {
  const ctx = makeCtx(); ctx.getMode = () => undefined;
  expect(isToolExecution(ctx)).toBe(true);
});
test('manual run is not a tool', () => {
  expect(isToolExecution(makeCtx({ mode: 'manual' }))).toBe(false);
});
test('reveal denied when revealPlaintext false even in manual', () => {
  expect(canRevealPlaintext(makeCtx({ mode: 'manual', params: { revealPlaintext: false } }), 0)).toBe(false);
});
test('reveal denied in tool ctx even when revealPlaintext true', () => {
  expect(canRevealPlaintext(makeCtx({ isTool: true, params: { revealPlaintext: true } }), 0)).toBe(false);
});
test('reveal allowed only: manual + revealPlaintext true', () => {
  expect(canRevealPlaintext(makeCtx({ mode: 'manual', params: { revealPlaintext: true } }), 0)).toBe(true);
});
test('AI-supplied revealPlaintext string is ignored (must be real boolean true)', () => {
  expect(canRevealPlaintext(makeCtx({ mode: 'manual', params: { revealPlaintext: 'true' } }), 0)).toBe(false);
});

// ─── Extra security tests ─────────────────────────────────────────────────────

test('additionalData.aiTool true ⇒ tool (fail closed)', () => {
  const ctx = makeCtx({ mode: 'manual' });
  ctx.additionalData = { aiTool: true };
  expect(isToolExecution(ctx)).toBe(true);
});

test('additionalData.isTool true ⇒ tool (fail closed)', () => {
  const ctx = makeCtx({ mode: 'manual' });
  ctx.additionalData = { isTool: true };
  expect(isToolExecution(ctx)).toBe(true);
});

test('getMode throws ⇒ fail closed (treated as tool)', () => {
  const ctx = makeCtx({ mode: 'manual' });
  ctx.getMode = () => { throw new Error('unexpected'); };
  expect(isToolExecution(ctx)).toBe(true);
});

test('getNodeParameter missing ⇒ canRevealPlaintext false', () => {
  const ctx = makeCtx({ mode: 'manual', params: { revealPlaintext: true } });
  delete ctx.getNodeParameter;
  expect(canRevealPlaintext(ctx, 0)).toBe(false);
});

test('revealPlaintext true + mode webhook (SAFE) + no tool markers ⇒ canReveal true', () => {
  // webhook is in SAFE_MODES; no isTool markers set
  expect(canRevealPlaintext(makeCtx({ mode: 'webhook', params: { revealPlaintext: true } }), 0)).toBe(true);
});

test('revealPlaintext numeric 1 ⇒ false (strict true only)', () => {
  expect(canRevealPlaintext(makeCtx({ mode: 'manual', params: { revealPlaintext: 1 } }), 0)).toBe(false);
});

test('revealPlaintext null ⇒ false', () => {
  expect(canRevealPlaintext(makeCtx({ mode: 'manual', params: { revealPlaintext: null } }), 0)).toBe(false);
});

test('getNode throws ⇒ isToolExecution true (fail closed)', () => {
  const ctx = makeCtx({ mode: 'manual' });
  ctx.getNode = () => { throw new Error('boom'); };
  expect(isToolExecution(ctx)).toBe(true);
});

test('node parameters __isToolCall true ⇒ tool even with safe mode', () => {
  const ctx = makeCtx({ mode: 'manual' });
  ctx.getNode = () => ({ parameters: { __isToolCall: true } });
  expect(isToolExecution(ctx)).toBe(true);
});

test('all SAFE_MODES are not tool executions (no tool markers)', () => {
  const SAFE_MODES = ['manual', 'trigger', 'webhook', 'retry', 'cli', 'integrated', 'internal'];
  for (const mode of SAFE_MODES) {
    expect(isToolExecution(makeCtx({ mode }))).toBe(false);
  }
});

test('mode "tool" (hypothetical future n8n mode) ⇒ fail closed', () => {
  expect(isToolExecution(makeCtx({ mode: 'tool' }))).toBe(true);
});

test('entirely null ctx ⇒ isToolExecution true (fail closed)', () => {
  expect(isToolExecution(null)).toBe(true);
});

test('entirely null ctx ⇒ canRevealPlaintext false', () => {
  expect(canRevealPlaintext(null, 0)).toBe(false);
});

test('ctx without getMode but with safe additionalData ⇒ fail closed (no getMode = inconclusive)', () => {
  const ctx = makeCtx({ params: { revealPlaintext: true } });
  delete ctx.getMode;
  expect(canRevealPlaintext(ctx, 0)).toBe(false);
});

test('revealPlaintext object ⇒ false (strict true only)', () => {
  expect(canRevealPlaintext(makeCtx({ mode: 'manual', params: { revealPlaintext: {} } }), 0)).toBe(false);
});

test('reveal denied when mode is "trigger" but __isToolCall is true', () => {
  const ctx = makeCtx({ mode: 'trigger', params: { revealPlaintext: true } });
  ctx.getNode = () => ({ parameters: { __isToolCall: true } });
  expect(canRevealPlaintext(ctx, 0)).toBe(false);
});
