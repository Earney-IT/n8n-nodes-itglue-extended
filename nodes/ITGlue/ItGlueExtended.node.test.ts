import { ITGlue } from './ItGlueExtended.node';

test('node is usableAsTool and lists enabled resources', () => {
  const n = new ITGlue();
  expect(n.description.usableAsTool).toBe(true);
  expect(n.description.name).toBe('itGlueExtended');
  const resourceProp = n.description.properties.find(p => p.name === 'resource')!;
  const vals = (resourceProp.options as Array<{ value: string }>).map(o => o.value);
  expect(vals).toContain('password');
  expect(vals).toContain('configuration');
});

test('SECURITY: password get under tool execution with revealPlaintext true is redacted by the node', async () => {
  const { ITGlue } = require('./ItGlueExtended.node');
  const node = new ITGlue();
  // minimal real-shaped ctx: isToolExecution()=>true, ambient mode 'manual'
  const calls: any[] = [];
  const ctx: any = {
    getInputData: () => [{ json: {} }],
    getNode: () => ({ name: 'IT Glue', type: 'itGlueExtended', parameters: {} }),
    getMode: () => 'manual',
    isToolExecution: () => true,
    continueOnFail: () => false,
    getNodeParameter: (nm: string, _i: number, d?: unknown) =>
      ({ resource: 'password', operation: 'get', passwordId: '3', revealPlaintext: true } as any)[nm] ?? d,
    getCredentials: async () => ({ region: 'api', apiKey: 'k' }),
    helpers: {
      httpRequestWithAuthentication: async (_c: string, o: any) => { calls.push(o); return { data: { id: '3', type: 'passwords', attributes: { password: 'TOPSECRET' } } }; },
      returnJsonArray: (x: any) => (Array.isArray(x) ? x : [x]).map((j: any) => ({ json: j })),
    },
  };
  const out = await node.execute.call(ctx);
  const flat = out[0];
  expect(JSON.stringify(flat)).not.toContain('TOPSECRET');
  expect(calls[0].qs?.show_password).toBeUndefined();
});

test('empty result yields a found:0 envelope (n8n #26202)', async () => {
  const node = new ITGlue();
  const ctx: any = {
    getInputData: () => [{ json: {} }],
    getNode: () => ({ name: 'IT Glue', type: 'itGlueExtended', parameters: {} }),
    getMode: () => 'manual',
    isToolExecution: () => false,
    continueOnFail: () => false,
    getNodeParameter: (nm: string, _i: number, d?: unknown) =>
      ({ resource: 'contactType', operation: 'getAll', returnAll: true } as any)[nm] ?? d,
    getCredentials: async () => ({ region: 'api', apiKey: 'k' }),
    helpers: {
      httpRequestWithAuthentication: async () => ({ data: [] }),
      returnJsonArray: (x: any) => (Array.isArray(x) ? x : [x]).map((j: any) => ({ json: j })),
    },
  };
  const out = await node.execute.call(ctx);
  expect(out[0][0].json.found).toBe(0);
  expect(out[0][0].json.resource).toBe('contactType');
});

test('continueOnFail captures the error instead of throwing', async () => {
  const node = new ITGlue();
  const ctx: any = {
    getInputData: () => [{ json: {} }],
    getNode: () => ({ name: 'IT Glue', type: 'itGlueExtended', parameters: {} }),
    getMode: () => 'manual',
    isToolExecution: () => false,
    continueOnFail: () => true,
    getNodeParameter: (nm: string, _i: number, d?: unknown) =>
      ({ resource: 'nope', operation: 'getAll' } as any)[nm] ?? d,
    getCredentials: async () => ({ region: 'api', apiKey: 'k' }),
    helpers: {
      httpRequestWithAuthentication: async () => ({ data: [] }),
      returnJsonArray: (x: any) => (Array.isArray(x) ? x : [x]).map((j: any) => ({ json: j })),
    },
  };
  const out = await node.execute.call(ctx);
  expect(typeof out[0][0].json.error).toBe('string');
  expect(out[0][0].json.error).toMatch(/Unsupported resource/);
});
