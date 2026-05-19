import { loadOptions } from './index';
import { makeCtx } from '../__testutils__/makeCtx';

test('getOrganizations maps id+name and sorts', async () => {
  const ctx = makeCtx({ httpResponses: [{ data: [{ id: '2', attributes: { name: 'Beta' } }, { id: '1', attributes: { name: 'Alpha' } }] }] });
  const r = await loadOptions.getOrganizations.call(ctx);
  expect(r).toEqual([{ name: 'Alpha', value: '1' }, { name: 'Beta', value: '2' }]);
});

test('getPasswordCategories calls correct endpoint', async () => {
  const ctx = makeCtx({ httpResponses: [{ data: [{ id: '5', attributes: { name: 'Shared' } }] }] });
  await loadOptions.getPasswordCategories.call(ctx);
  expect(ctx._calls[0].url).toMatch(/\/password_categories$/);
});

test('item with title instead of name uses title', async () => {
  const ctx = makeCtx({ httpResponses: [{ data: [{ id: '7', attributes: { title: 'My Title' } }] }] });
  const r = await loadOptions.getOrganizations.call(ctx);
  expect(r).toEqual([{ name: 'My Title', value: '7' }]);
});

test('item missing attributes falls back to id', async () => {
  const ctx = makeCtx({ httpResponses: [{ data: [{ id: '42' }] }] });
  const r = await loadOptions.getOrganizations.call(ctx);
  expect(r).toEqual([{ name: '42', value: '42' }]);
});

test('getFlexibleAssetTypeFields with typeId maps name to name-key', async () => {
  const ctx = makeCtx({
    httpResponses: [{
      data: [
        { id: '10', attributes: { name: 'Serial Number', 'name-key': 'serial-number' } },
        { id: '11', attributes: { name: 'Hostname', 'name-key': 'hostname' } },
      ],
    }],
  });
  ctx.getCurrentNodeParameter = () => '11';
  const r = await loadOptions.getFlexibleAssetTypeFields.call(ctx);
  expect(ctx._calls[0].url).toMatch(/flexible_asset_types\/11\/relationships\/flexible_asset_fields$/);
  expect(r).toEqual([
    { name: 'Serial Number', value: 'serial-number' },
    { name: 'Hostname', value: 'hostname' },
  ]);
});

test('getFlexibleAssetTypeFields with empty typeId returns []', async () => {
  const ctx = makeCtx({ httpResponses: [] });
  ctx.getCurrentNodeParameter = () => '';
  const r = await loadOptions.getFlexibleAssetTypeFields.call(ctx);
  expect(r).toEqual([]);
});
