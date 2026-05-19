import { executeDocument } from './documents';
import { makeCtx } from '../../__testutils__/makeCtx';

// ---- required tests from spec ----

test('document getAll hits documents endpoint', async () => {
  const ctx = makeCtx({ params: { operation: 'getAll', documentResource: 'document', returnAll: false, limit: 5 }, httpResponses: [{ data: [] }] });
  await executeDocument.call(ctx, 0);
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/documents');
});

test('section create posts to document_sections', async () => {
  // documentId is required for sections (they belong to a document); added to reflect the create guard
  const ctx = makeCtx({ params: { operation: 'create', documentResource: 'section', name: 'Intro', documentId: '5' }, httpResponses: [{ data: { id: 's1', type: 'document_sections', attributes: { name: 'Intro' } } }] });
  const out = await executeDocument.call(ctx, 0);
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/document_sections');
  expect(ctx._calls[0].body.data.type).toBe('document_sections');
  expect((out[0].json as any).id).toBe('s1');
});

test('document publish patches published flag', async () => {
  const ctx = makeCtx({ params: { operation: 'publish', documentResource: 'document', documentId: '9' }, httpResponses: [{ data: { id: '9', type: 'documents', attributes: { published: true } } }] });
  await executeDocument.call(ctx, 0);
  expect(ctx._calls[0].method).toBe('PATCH');
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/documents/9');
  expect(ctx._calls[0].body.data.attributes.published).toBe(true);
});

// ---- extra tests ----

test('document getAll returnAll=true calls itGlueApiRequestAllItems path', async () => {
  const ctx = makeCtx({ params: { operation: 'getAll', documentResource: 'document', returnAll: true },
    httpResponses: [{ data: [{ id: 'd1', type: 'documents', attributes: { name: 'My Doc' } }] }] });
  const out = await executeDocument.call(ctx, 0);
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/documents');
  expect((out[0].json as any).id).toBe('d1');
});

test('document get fetches by documentId', async () => {
  const ctx = makeCtx({ params: { operation: 'get', documentResource: 'document', documentId: 'd5' },
    httpResponses: [{ data: { id: 'd5', type: 'documents', attributes: { name: 'My Doc' } } }] });
  const out = await executeDocument.call(ctx, 0);
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/documents/d5');
  expect((out[0].json as any).id).toBe('d5');
});

test('document update sends PATCH with correct URL and body', async () => {
  const ctx = makeCtx({ params: { operation: 'update', documentResource: 'document', documentId: 'd7', name: 'Updated Name', content: '<p>New content</p>' },
    httpResponses: [{ data: { id: 'd7', type: 'documents', attributes: { name: 'Updated Name' } } }] });
  const out = await executeDocument.call(ctx, 0);
  expect(ctx._calls[0].method).toBe('PATCH');
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/documents/d7');
  expect(ctx._calls[0].body.data.attributes.name).toBe('Updated Name');
  expect(ctx._calls[0].body.data.id).toBe('d7');
  expect((out[0].json as any).id).toBe('d7');
});

test('document delete sends DELETE and returns success', async () => {
  const ctx = makeCtx({ params: { operation: 'delete', documentResource: 'document', documentId: 'd3' }, httpResponses: [{}] });
  const out = await executeDocument.call(ctx, 0);
  expect(ctx._calls[0].method).toBe('DELETE');
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/documents/d3');
  expect((out[0].json as any).success).toBe(true);
  expect((out[0].json as any).id).toBe('d3');
});

test('section get fetches by sectionId', async () => {
  const ctx = makeCtx({ params: { operation: 'get', documentResource: 'section', sectionId: 's10' },
    httpResponses: [{ data: { id: 's10', type: 'document_sections', attributes: { name: 'Section A' } } }] });
  const out = await executeDocument.call(ctx, 0);
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/document_sections/s10');
  expect((out[0].json as any).id).toBe('s10');
});

test('section update sends PATCH to document_sections/<id>', async () => {
  const ctx = makeCtx({ params: { operation: 'update', documentResource: 'section', sectionId: 's20', name: 'Updated Section' },
    httpResponses: [{ data: { id: 's20', type: 'document_sections', attributes: { name: 'Updated Section' } } }] });
  const out = await executeDocument.call(ctx, 0);
  expect(ctx._calls[0].method).toBe('PATCH');
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/document_sections/s20');
  expect(ctx._calls[0].body.data.id).toBe('s20');
  expect((out[0].json as any).id).toBe('s20');
});

test('section delete sends DELETE and returns success', async () => {
  const ctx = makeCtx({ params: { operation: 'delete', documentResource: 'section', sectionId: 's30' }, httpResponses: [{}] });
  const out = await executeDocument.call(ctx, 0);
  expect(ctx._calls[0].method).toBe('DELETE');
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/document_sections/s30');
  expect((out[0].json as any).success).toBe(true);
});

test('section create with parent documentId sets document-id attribute', async () => {
  const ctx = makeCtx({ params: { operation: 'create', documentResource: 'section', name: 'Intro', documentId: 'doc1' },
    httpResponses: [{ data: { id: 's2', type: 'document_sections', attributes: { name: 'Intro' } } }] });
  await executeDocument.call(ctx, 0);
  expect(ctx._calls[0].body.data.attributes['document-id']).toBe('doc1');
});

test('image create posts to document_images', async () => {
  const ctx = makeCtx({ params: { operation: 'create', documentResource: 'image', documentId: 'doc5' },
    httpResponses: [{ data: { id: 'img1', type: 'document_images', attributes: {} } }] });
  const out = await executeDocument.call(ctx, 0);
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/document_images');
  expect(ctx._calls[0].body.data.type).toBe('document_images');
  expect(ctx._calls[0].body.data.attributes['document-id']).toBe('doc5');
  expect((out[0].json as any).id).toBe('img1');
});

test('image get fetches by imageId', async () => {
  const ctx = makeCtx({ params: { operation: 'get', documentResource: 'image', imageId: 'img5' },
    httpResponses: [{ data: { id: 'img5', type: 'document_images', attributes: {} } }] });
  const out = await executeDocument.call(ctx, 0);
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/document_images/img5');
  expect((out[0].json as any).id).toBe('img5');
});

test('image update sends PATCH to document_images/<id>', async () => {
  const ctx = makeCtx({ params: { operation: 'update', documentResource: 'image', imageId: 'img7', name: 'Updated Image' },
    httpResponses: [{ data: { id: 'img7', type: 'document_images', attributes: {} } }] });
  await executeDocument.call(ctx, 0);
  expect(ctx._calls[0].method).toBe('PATCH');
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/document_images/img7');
});

test('image delete sends DELETE and returns success', async () => {
  const ctx = makeCtx({ params: { operation: 'delete', documentResource: 'image', imageId: 'img9' }, httpResponses: [{}] });
  const out = await executeDocument.call(ctx, 0);
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/document_images/img9');
  expect((out[0].json as any).success).toBe(true);
});

test('publish on section throws NodeOperationError', async () => {
  const ctx = makeCtx({ params: { operation: 'publish', documentResource: 'section', sectionId: 's1' } });
  await expect(executeDocument.call(ctx, 0)).rejects.toThrow(/publish is only valid for documentResource 'document'/);
});

test('publish on image throws NodeOperationError', async () => {
  const ctx = makeCtx({ params: { operation: 'publish', documentResource: 'image', imageId: 'img1' } });
  await expect(executeDocument.call(ctx, 0)).rejects.toThrow(/publish is only valid for documentResource 'document'/);
});

test('document get missing documentId throws', async () => {
  const ctx = makeCtx({ params: { operation: 'get', documentResource: 'document' } });
  await expect(executeDocument.call(ctx, 0)).rejects.toThrow('"documentId" is required');
});

test('section get missing sectionId throws', async () => {
  const ctx = makeCtx({ params: { operation: 'get', documentResource: 'section' } });
  await expect(executeDocument.call(ctx, 0)).rejects.toThrow('"sectionId" is required');
});

test('document publish missing documentId throws', async () => {
  const ctx = makeCtx({ params: { operation: 'publish', documentResource: 'document' } });
  await expect(executeDocument.call(ctx, 0)).rejects.toThrow('"documentId" is required');
});

test('section create without documentId throws', async () => {
  const ctx = makeCtx({ params: { operation: 'create', documentResource: 'section', name: 'Intro' } });
  await expect(executeDocument.call(ctx, 0)).rejects.toThrow(/"documentId" is required/);
});

test('document update with no fields throws', async () => {
  const ctx = makeCtx({ params: { operation: 'update', documentResource: 'document', documentId: '9' } });
  await expect(executeDocument.call(ctx, 0)).rejects.toThrow(/at least one field/);
});
