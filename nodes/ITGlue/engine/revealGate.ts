// Execution modes that, BY THEMSELVES, are never sufficient proof of a
// non-tool run — but a tool sub-execution still runs under one of these
// ambient modes, so SAFE_MODES is necessary-but-insufficient defense only.
const SAFE_MODES = ['manual', 'trigger', 'webhook', 'retry', 'cli', 'integrated', 'internal'];

/**
 * Fail-closed detection of AI-tool / node-as-tool execution.
 *
 * SECURITY MODEL (verified against n8n-workflow@2.16.0):
 *   - The pinned `WorkflowExecuteMode` union has NO `'tool'` member. When a
 *     `usableAsTool` node is invoked by an AI Agent, its `execute()` runs
 *     under the AMBIENT workflow mode (manual / webhook / trigger /
 *     integrated …) — all of which are in SAFE_MODES. So `getMode()` can
 *     NEVER be positive proof that "this is not a tool"; relying on it alone
 *     leaks plaintext to the LLM.
 *   - The OFFICIAL, required signal is `ctx.isToolExecution(): boolean`
 *     ("Returns true if the node is being executed as an AI Agent tool",
 *     declared on `IExecuteFunctions`). Its very PRESENCE is the runtime
 *     version gate: an older/unknown runtime that lacks the method is
 *     treated as a tool (fail closed).
 *   - The fabricated markers (`getNode().parameters.__isToolCall`,
 *     `additionalData.{isToolExecution,aiTool,isTool}`) are NOT set by real
 *     n8n — they are belt-and-braces defense-in-depth only and are no longer
 *     load-bearing, but kept as harmless extra positive blockers.
 *
 * Returns TRUE (treat as tool ⇒ block reveal) UNLESS all of the following
 * hold, in which case it returns FALSE (positively not a tool):
 *   1. No fabricated tool marker is truthy.
 *   2. `ctx.isToolExecution` is a function (official signal present).
 *   3. `ctx.isToolExecution()` returns the strict boolean `false`.
 *   4. `ctx.getMode()` returns a string in SAFE_MODES.
 * Any error / throw / inconclusive signal ⇒ TRUE (fail closed).
 */
export function isToolExecution(ctx: unknown): boolean {
  try {
    const c = ctx as {
      getNode?: () => { parameters?: Record<string, unknown> } | undefined;
      getMode?: () => string | undefined;
      isToolExecution?: () => boolean;
      additionalData?: Record<string, unknown>;
    };

    // (1) Fabricated belt-and-braces markers — harmless extra defense; if any
    //     is truthy, positively treat as a tool. No longer load-bearing.
    const node = typeof c.getNode === 'function' ? c.getNode() : undefined;
    if (node?.parameters && node.parameters.__isToolCall) return true;
    const extra = c.additionalData ?? {};
    if (extra.isToolExecution || extra.aiTool || extra.isTool) return true;

    // (2) Official n8n signal MUST be present. Absent ⇒ unknown/old runtime
    //     ⇒ fail closed. Presence of this method is itself the version gate.
    if (typeof c.isToolExecution !== 'function') return true;

    // (3) Official signal must return the STRICT boolean false. Anything
    //     else (true / undefined / non-false) ⇒ fail closed. A throw is
    //     caught below ⇒ fail closed.
    const officialSaysTool = c.isToolExecution();
    if (officialSaysTool !== false) return true;

    // (4) Mode must additionally be a known safe ambient mode
    //     (necessary-but-insufficient, layered on top of the official signal).
    const mode = typeof c.getMode === 'function' ? c.getMode() : undefined;
    if (typeof mode !== 'string' || !SAFE_MODES.includes(mode)) return true;

    // All four conditions satisfied ⇒ positively not a tool.
    return false;
  } catch {
    return true; // any error ⇒ fail closed
  }
}

/**
 * Plaintext reveal is permitted ONLY when BOTH:
 *  - the author-set `revealPlaintext` node param is the strict boolean `true`
 *    (an AI-supplied string like 'true' is NOT accepted), AND
 *  - the execution is positively NOT an AI/tool invocation (per the
 *    corrected `isToolExecution`, which now requires the official
 *    `ctx.isToolExecution() === false`).
 * Otherwise (including any doubt) ⇒ false.
 */
export function canRevealPlaintext(ctx: unknown, index: number): boolean {
  try {
    const c = ctx as { getNodeParameter?: (n: string, i: number, d?: unknown) => unknown };
    const raw = typeof c.getNodeParameter === 'function'
      ? c.getNodeParameter('revealPlaintext', index, false)
      : false;
    if (raw !== true) return false;            // strict boolean true only
    if (isToolExecution(ctx)) return false;    // fail closed if tool/uncertain
    return true;
  } catch {
    return false;
  }
}
