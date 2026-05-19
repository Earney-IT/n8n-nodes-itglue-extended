import { executeAttachment } from './attachments';
import { makeCtx } from '../../__testutils__/makeCtx';

test('create posts base64 to parent relationship route', async () => {
  const ctx = makeCtx({ params: { operation: 'create', resourceType: 'passwords', resourceId: '7', fileName: 'a.txt', fileBase64: 'QQ==' },
    httpResponses: [{ data: { id: 'att1', type: 'attachments', attributes: {} } }] });
  const out = await executeAttachment.call(ctx, 0);
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/passwords/7/relationships/attachments');
  expect(ctx._calls[0].body.data.attributes.attachment).toBe('QQ==');
  expect((out[0].json as any).id).toBe('att1');
});

test('list reads parent relationship route', async () => {
  const ctx = makeCtx({ params: { operation: 'getAll', resourceType: 'documents', resourceId: '2', returnAll: false, limit: 5 },
    httpResponses: [{ data: [] }] });
  await executeAttachment.call(ctx, 0);
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/documents/2/relationships/attachments');
});

// ---- extra tests ----

test('getAll returnAll=true calls itGlueApiRequestAllItems path', async () => {
  const ctx = makeCtx({
    params: { operation: 'getAll', resourceType: 'configurations', resourceId: '99', returnAll: true },
    httpResponses: [{ data: [{ id: 'a1', type: 'attachments', attributes: { name: 'file.pdf' } }] }],
  });
  const out = await executeAttachment.call(ctx, 0);
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/configurations/99/relationships/attachments');
  expect((out[0].json as any).id).toBe('a1');
});

test('get single attachment hits correct URL', async () => {
  const ctx = makeCtx({
    params: { operation: 'get', resourceType: 'contacts', resourceId: '10', attachmentId: 'att42' },
    httpResponses: [{ data: { id: 'att42', type: 'attachments', attributes: { name: 'doc.docx' } } }],
  });
  const out = await executeAttachment.call(ctx, 0);
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/contacts/10/relationships/attachments/att42');
  expect((out[0].json as any).id).toBe('att42');
  expect((out[0].json as any).name).toBe('doc.docx');
});

test('update sends PATCH with correct URL and body', async () => {
  const ctx = makeCtx({
    params: { operation: 'update', resourceType: 'domains', resourceId: '3', attachmentId: 'att55', name: 'renamed.txt' },
    httpResponses: [{ data: { id: 'att55', type: 'attachments', attributes: { name: 'renamed.txt' } } }],
  });
  const out = await executeAttachment.call(ctx, 0);
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/domains/3/relationships/attachments/att55');
  expect(ctx._calls[0].body.data.attributes.name).toBe('renamed.txt');
  expect(ctx._calls[0].body.data.id).toBe('att55');
  expect((out[0].json as any).id).toBe('att55');
});

test('delete sends DELETE with bulk-destroy body', async () => {
  const ctx = makeCtx({
    params: { operation: 'delete', resourceType: 'passwords', resourceId: '7', attachmentId: 'att99' },
    httpResponses: [{}],
  });
  const out = await executeAttachment.call(ctx, 0);
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/passwords/7/relationships/attachments');
  expect(ctx._calls[0].body.data[0].id).toBe('att99');
  expect(ctx._calls[0].body.data[0].type).toBe('attachments');
  expect((out[0].json as any).success).toBe(true);
});

test('bulkDelete sends DELETE with multiple IDs', async () => {
  const ctx = makeCtx({
    params: { operation: 'bulkDelete', resourceType: 'locations', resourceId: '5', attachmentIds: ['a1', 'a2', 'a3'] },
    httpResponses: [{}],
  });
  const out = await executeAttachment.call(ctx, 0);
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/locations/5/relationships/attachments');
  expect(ctx._calls[0].body.data).toHaveLength(3);
  expect(ctx._calls[0].body.data[2].id).toBe('a3');
  expect((out[0].json as any).deleted).toEqual(['a1', 'a2', 'a3']);
});

test('binary path via injected getBinaryDataBuffer', async () => {
  const ctx = makeCtx({
    params: { operation: 'create', resourceType: 'ssl_certificates', resourceId: '88', binaryPropertyName: 'data', fileName: 'cert.pem' },
    httpResponses: [{ data: { id: 'att77', type: 'attachments', attributes: {} } }],
  });
  // Inject the binary helper not provided by default makeCtx
  ctx.helpers.getBinaryDataBuffer = async () => Buffer.from('AB');
  const out = await executeAttachment.call(ctx, 0);
  expect(ctx._calls[0].body.data.attributes.attachment).toBe(Buffer.from('AB').toString('base64'));
  expect((out[0].json as any).id).toBe('att77');
});

test('missing resourceType throws NodeOperationError', async () => {
  const ctx = makeCtx({
    params: { operation: 'create', resourceId: '7', fileName: 'a.txt', fileBase64: 'QQ==' },
  });
  await expect(executeAttachment.call(ctx, 0)).rejects.toThrow('"resourceType" is required');
});

test('missing resourceId throws NodeOperationError', async () => {
  const ctx = makeCtx({
    params: { operation: 'create', resourceType: 'passwords', fileName: 'a.txt', fileBase64: 'QQ==' },
  });
  await expect(executeAttachment.call(ctx, 0)).rejects.toThrow('"resourceId" is required');
});

test('create with no file content throws NodeOperationError', async () => {
  const ctx = makeCtx({
    params: { operation: 'create', resourceType: 'passwords', resourceId: '7' },
  });
  await expect(executeAttachment.call(ctx, 0)).rejects.toThrow('Provide fileBase64 or a binaryPropertyName');
});
