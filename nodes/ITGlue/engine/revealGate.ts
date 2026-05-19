// Execution modes that are definitively NOT an AI-tool invocation.
const SAFE_MODES = ['manual', 'trigger', 'webhook', 'retry', 'cli', 'integrated', 'internal'];

/**
 * Fail-closed detection of AI-tool / node-as-tool execution.
 * Returns TRUE (treat as tool ⇒ block reveal) unless we can POSITIVELY
 * confirm this is a normal workflow execution. Any error or inconclusive
 * signal ⇒ TRUE.
 *
 * NOTE: n8n does not expose a single stable public "am I a tool" boolean
 * across versions. We therefore (a) check the known tool-wrapper markers,
 * and (b) require a known-safe execution mode; anything else fails closed.
 * Confirm marker field names against the pinned n8n-workflow when wiring
 * the node (Task 18), but the CONTRACT (inconclusive ⇒ blocked) is fixed
 * and enforced by tests here.
 */
export function isToolExecution(ctx: unknown): boolean {
  try {
    const c = ctx as {
      getNode?: () => { parameters?: Record<string, unknown> } | undefined;
      getMode?: () => string | undefined;
      additionalData?: Record<string, unknown>;
    };
    const node = typeof c.getNode === 'function' ? c.getNode() : undefined;
    if (node?.parameters && node.parameters.__isToolCall) return true;
    const extra = c.additionalData ?? {};
    if (extra.isToolExecution || extra.aiTool || extra.isTool) return true;
    const mode = typeof c.getMode === 'function' ? c.getMode() : undefined;
    if (typeof mode === 'string' && SAFE_MODES.includes(mode)) return false;
    return true; // inconclusive / unknown mode ⇒ fail closed
  } catch {
    return true; // any error ⇒ fail closed
  }
}

/**
 * Plaintext reveal is permitted ONLY when BOTH:
 *  - the author-set `revealPlaintext` node param is the strict boolean `true`
 *    (an AI-supplied string like 'true' is NOT accepted), AND
 *  - the execution is positively NOT an AI/tool invocation.
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
