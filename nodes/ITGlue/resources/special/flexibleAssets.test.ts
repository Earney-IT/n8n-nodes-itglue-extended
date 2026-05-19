import { executeFlexibleAsset } from './flexibleAssets';
import { makeCtx } from '../../__testutils__/makeCtx';

// ── Spec-required tests ──────────────────────────────────────────────────────

test('create wraps traits + flexible-asset-type-id into JSON:API body', async () => {
  const ctx = makeCtx({ params: { operation: 'create', flexibleAssetTypeId: '11', organizationId: '3',
      traits: { trait: [{ name: 'host', value: 'srv01' }, { name: 'port', value: '443' }] } },
    httpResponses: [{ data: { id: 'fa1', type: 'flexible_assets', attributes: { traits: { host: 'srv01' } } } }] });
  const out = await executeFlexibleAsset.call(ctx, 0);
  const body = ctx._calls[0].body.data;
  expect(body.type).toBe('flexible-assets');
  expect(body.attributes['flexible-asset-type-id']).toBe('11');
  expect(body.attributes['organization-id']).toBe('3');
  expect(body.attributes.traits).toEqual({ host: 'srv01', port: '443' });
  expect((out[0].json as any).id).toBe('fa1');
});

test('get/getAll/update/delete reach flexible_assets endpoints', async () => {
  const ctx = makeCtx({ params: { operation: 'get', flexibleAssetId: '5' }, httpResponses: [{ data: { id: '5', type: 'flexible_assets', attributes: {} } }] });
  await executeFlexibleAsset.call(ctx, 0);
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/flexible_assets/5');
});

// ── Extra tests ──────────────────────────────────────────────────────────────

test('update sends PATCH to correct URL with traits and id in body', async () => {
  const ctx = makeCtx({
    params: {
      operation: 'update',
      flexibleAssetId: '99',
      flexibleAssetTypeId: '11',
      traits: { trait: [{ name: 'host', value: 'srv02' }] },
    },
    httpResponses: [{ data: { id: '99', type: 'flexible_assets', attributes: { traits: { host: 'srv02' } } } }],
  });
  const out = await executeFlexibleAsset.call(ctx, 0);
  expect(ctx._calls[0].method).toBe('PATCH');
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/flexible_assets/99');
  const body = ctx._calls[0].body.data;
  expect(body.id).toBe('99');
  expect(body.type).toBe('flexible-assets');
  expect(body.attributes.traits).toEqual({ host: 'srv02' });
  expect(body.attributes['flexible-asset-type-id']).toBe('11');
  expect((out[0].json as any).id).toBe('99');
});

test('update without flexibleAssetTypeId still works (no flexible-asset-type-id in attrs)', async () => {
  const ctx = makeCtx({
    params: {
      operation: 'update',
      flexibleAssetId: '99',
      traits: { trait: [{ name: 'host', value: 'srv03' }] },
    },
    httpResponses: [{ data: { id: '99', type: 'flexible_assets', attributes: {} } }],
  });
  await executeFlexibleAsset.call(ctx, 0);
  const body = ctx._calls[0].body.data;
  expect(body.attributes['flexible-asset-type-id']).toBeUndefined();
  expect(body.attributes.traits).toEqual({ host: 'srv03' });
});

test('getAll without flexibleAssetTypeId throws NodeOperationError', async () => {
  const ctx = makeCtx({ params: { operation: 'getAll' }, httpResponses: [] });
  await expect(executeFlexibleAsset.call(ctx, 0)).rejects.toThrow(
    'getAll Flexible Asset requires "flexibleAssetTypeId"',
  );
});

test('getAll with typeId sets filter qs and returns items (non-returnAll)', async () => {
  const ctx = makeCtx({
    params: { operation: 'getAll', flexibleAssetTypeId: '11', returnAll: false, limit: 10 },
    httpResponses: [{ data: [{ id: 'fa1', type: 'flexible_assets', attributes: { traits: {} } }] }],
  });
  const out = await executeFlexibleAsset.call(ctx, 0);
  expect(ctx._calls[0].qs['filter[flexible-asset-type-id]']).toBe('11');
  expect(out).toHaveLength(1);
  expect((out[0].json as any).id).toBe('fa1');
});

test('getAll returnAll path calls itGlueApiRequestAllItems (pagination)', async () => {
  const ctx = makeCtx({
    params: { operation: 'getAll', flexibleAssetTypeId: '7', returnAll: true },
    httpResponses: [
      { data: [{ id: 'fa2', type: 'flexible_assets', attributes: {} }, { id: 'fa3', type: 'flexible_assets', attributes: {} }] },
    ],
  });
  const out = await executeFlexibleAsset.call(ctx, 0);
  // returnAll triggered; filter present
  expect(ctx._calls[0].qs['filter[flexible-asset-type-id]']).toBe('7');
  expect(out).toHaveLength(2);
});

test('delete sends DELETE to correct URL and returns success', async () => {
  const ctx = makeCtx({
    params: { operation: 'delete', flexibleAssetId: '42' },
    httpResponses: [{}],
  });
  const out = await executeFlexibleAsset.call(ctx, 0);
  expect(ctx._calls[0].method).toBe('DELETE');
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/flexible_assets/42');
  expect((out[0].json as any).success).toBe(true);
  expect((out[0].json as any).id).toBe('42');
});

test('bulkDelete with empty ids throws NodeOperationError', async () => {
  const ctx = makeCtx({ params: { operation: 'bulkDelete', flexibleAssetIds: [] } });
  await expect(executeFlexibleAsset.call(ctx, 0)).rejects.toThrow(
    '"flexibleAssetIds" must contain at least one ID',
  );
});

test('bulkDelete with ids sends correct body', async () => {
  const ctx = makeCtx({
    params: { operation: 'bulkDelete', flexibleAssetIds: ['10', '20', '30'] },
    httpResponses: [{}],
  });
  const out = await executeFlexibleAsset.call(ctx, 0);
  expect(ctx._calls[0].method).toBe('DELETE');
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/flexible_assets');
  const bodyData = ctx._calls[0].body.data;
  expect(bodyData).toEqual([
    { type: 'flexible-assets', id: '10' },
    { type: 'flexible-assets', id: '20' },
    { type: 'flexible-assets', id: '30' },
  ]);
  expect((out[0].json as any).success).toBe(true);
  expect((out[0].json as any).deleted).toEqual(['10', '20', '30']);
});

test('create without flexibleAssetTypeId throws NodeOperationError', async () => {
  const ctx = makeCtx({
    params: { operation: 'create', organizationId: '3', traits: { trait: [] } },
  });
  await expect(executeFlexibleAsset.call(ctx, 0)).rejects.toThrow(
    '"flexibleAssetTypeId" is required for "create"',
  );
});

test('create without organizationId omits organization-id and uses flexible_assets endpoint', async () => {
  const ctx = makeCtx({
    params: {
      operation: 'create',
      flexibleAssetTypeId: '11',
      traits: { trait: [{ name: 'host', value: 'srv01' }] },
    },
    httpResponses: [{ data: { id: 'fa5', type: 'flexible_assets', attributes: { traits: { host: 'srv01' } } } }],
  });
  await executeFlexibleAsset.call(ctx, 0);
  const body = ctx._calls[0].body.data;
  expect(body.attributes['organization-id']).toBeUndefined();
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/flexible_assets');
});

test('get without flexibleAssetId throws NodeOperationError', async () => {
  const ctx = makeCtx({ params: { operation: 'get' } });
  await expect(executeFlexibleAsset.call(ctx, 0)).rejects.toThrow(
    '"flexibleAssetId" is required for "get"',
  );
});

test('get throws when resp.data is falsy', async () => {
  const ctx = makeCtx({
    params: { operation: 'get', flexibleAssetId: '5' },
    httpResponses: [{ data: null }],
  });
  await expect(executeFlexibleAsset.call(ctx, 0)).rejects.toThrow(
    'IT Glue returned no data for get on Flexible Asset',
  );
});

test('create throws when resp.data is falsy', async () => {
  const ctx = makeCtx({
    params: {
      operation: 'create',
      flexibleAssetTypeId: '11',
      organizationId: '3',
      traits: { trait: [] },
    },
    httpResponses: [{ data: null }],
  });
  await expect(executeFlexibleAsset.call(ctx, 0)).rejects.toThrow(
    'IT Glue returned no data for create on Flexible Asset',
  );
});

test('traits with no entries resolves to empty object', async () => {
  const ctx = makeCtx({
    params: {
      operation: 'create',
      flexibleAssetTypeId: '11',
      organizationId: '3',
      traits: { trait: [] },
    },
    httpResponses: [{ data: { id: 'fa9', type: 'flexible_assets', attributes: {} } }],
  });
  await executeFlexibleAsset.call(ctx, 0);
  const body = ctx._calls[0].body.data;
  expect(body.attributes.traits).toEqual({});
});

test('create with orgId uses nested org endpoint', async () => {
  const ctx = makeCtx({
    params: {
      operation: 'create',
      flexibleAssetTypeId: '11',
      organizationId: '42',
      traits: { trait: [] },
    },
    httpResponses: [{ data: { id: 'fa10', type: 'flexible_assets', attributes: {} } }],
  });
  await executeFlexibleAsset.call(ctx, 0);
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/organizations/42/relationships/flexible_assets');
});

test('collectTraits: undefined dropped; null/0/false/empty preserved', async () => {
  const ctx = makeCtx({
    params: { operation: 'create', flexibleAssetTypeId: '11',
      traits: { trait: [
        { name: 'count', value: 0 },
        { name: 'enabled', value: false },
        { name: 'label', value: '' },
        { name: 'cleared', value: null },
        { name: 'blank', value: undefined },
      ] } },
    httpResponses: [{ data: { id: 'fx1', type: 'flexible_assets', attributes: {} } }],
  });
  await executeFlexibleAsset.call(ctx, 0);
  const traits = ctx._calls[0].body.data.attributes.traits;
  expect(traits.count).toBe(0);
  expect(traits.enabled).toBe(false);
  expect(traits.label).toBe('');
  expect(traits.cleared).toBeNull();
  expect('blank' in traits).toBe(false);
});
