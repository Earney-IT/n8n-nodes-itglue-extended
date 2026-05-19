# IT Glue n8n Node Rewrite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `n8n-nodes-itglue-extended` as v2.0.0 — one `IT Glue` node with full CRUD across the entire IT Glue API, secret-safe (fail-closed) password handling, and first-class AI-agent tooling.

**Architecture:** A registry of `ResourceDescriptor` data objects drives a generic CRUD engine that auto-generates n8n properties and executes JSON:API requests. Resources that deviate (passwords, flexible assets, attachments, related items, exports, documents) register a descriptor plus a handler in `resources/special/`. Plaintext password reveal is fail-closed: only on positive proof of a non-tool execution **and** an author-set toggle.

**Tech Stack:** TypeScript 5.8, n8n-workflow (peer), Jest + ts-jest (mocked HTTP only), ESLint + eslint-plugin-n8n-nodes-base, gulp (icon copy), Node ≥ 20.15.

---

## Conventions for every task

- TDD: write the failing test, run it (see it fail), implement minimally, run it (see it pass), commit.
- Test runner: `npx jest <path> -t '<name>'`. Lint: `npm run lint`. Build: `npm run build`.
- Never call the live IT Glue API in unit tests. Use the `makeCtx()` fake context (Task 3) which stubs `this.helpers.httpRequest`.
- Commit messages end with: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- All file paths are relative to `/home/tristenrice/n8n-projects/n8n-nodes`.
- The reviewed reference node is read-only at `/home/tristenrice/n8n-projects/redanthrax-itglue-node-REFERENCE` — consult, never import.

---

## Phase 1 — Package scaffold

### Task 1: package.json, tsconfig, lint, gulp, jest config

**Files:**
- Create: `package.json`, `tsconfig.json`, `.eslintrc.js`, `.eslintrc.prepublish.js`, `.prettierrc.js`, `gulpfile.js`, `jest.config.js`, `index.js` (empty), `.editorconfig`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "n8n-nodes-itglue-extended",
  "version": "2.0.0",
  "description": "Comprehensive IT Glue API node for n8n: full CRUD on every resource, secret-safe passwords, AI-agent ready",
  "keywords": ["n8n-community-node-package", "n8n-nodes-itglue", "itglue", "kaseya", "msp"],
  "license": "MIT",
  "homepage": "https://github.com/Earney-IT/n8n-nodes-itglue-extended",
  "author": { "name": "Tristen Rice", "email": "support@earneyit.com" },
  "repository": { "type": "git", "url": "git+https://github.com/Earney-IT/n8n-nodes-itglue-extended.git" },
  "bugs": { "url": "https://github.com/Earney-IT/n8n-nodes-itglue-extended/issues" },
  "engines": { "node": ">=20.15" },
  "main": "index.js",
  "scripts": {
    "build": "npx rimraf dist && tsc && gulp build:icons",
    "dev": "tsc --watch",
    "format": "prettier nodes credentials --write",
    "lint": "eslint nodes credentials package.json",
    "lintfix": "eslint nodes credentials package.json --fix",
    "test": "jest",
    "prepublishOnly": "npm run build && npm test && eslint -c .eslintrc.prepublish.js nodes credentials package.json"
  },
  "files": ["dist", "docs", "README.md", "CHANGELOG.md"],
  "n8n": {
    "n8nNodesApiVersion": 1,
    "credentials": ["dist/credentials/ITGlueApi.credentials.js"],
    "nodes": ["dist/nodes/ITGlue/ITGlue.node.js"]
  },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "@types/node": "^24.5.0",
    "@typescript-eslint/parser": "~8.32.0",
    "eslint": "^8.57.0",
    "eslint-plugin-n8n-nodes-base": "^1.16.3",
    "gulp": "^5.0.0",
    "jest": "^29.7.0",
    "prettier": "^3.5.3",
    "rimraf": "^6.0.1",
    "ts-jest": "^29.2.5",
    "typescript": "^5.8.2"
  },
  "peerDependencies": { "n8n-workflow": "*" }
}
```

- [ ] **Step 2: Write `tsconfig.json`** (copy the reference repo's settings: target ES2019, module commonjs, `outDir: dist`, `strict: true`, `declaration: true`, include `nodes/**/*`, `credentials/**/*`; exclude `**/*.test.ts`).

- [ ] **Step 3: Write `jest.config.js`**

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['nodes/**/*.ts', 'credentials/**/*.ts'],
};
```

- [ ] **Step 4: Copy `.eslintrc.js`, `.eslintrc.prepublish.js`, `.prettierrc.js`, `gulpfile.js`, `.editorconfig`** verbatim from the reference repo (proven n8n-compliant config). Create empty `index.js`.

- [ ] **Step 5: `npm install`**

Run: `npm install`
Expected: completes, `node_modules/` present (already gitignored).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "Scaffold n8n-nodes-itglue-extended v2.0.0 package

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 2 — Credentials, transport, JSON:API, redaction

### Task 2: ITGlueApi credential

**Files:**
- Create: `credentials/ITGlueApi.credentials.ts`
- Test: `credentials/ITGlueApi.credentials.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { ITGlueApi } from './ITGlueApi.credentials';

test('credential exposes region + apiKey and x-api-key auth', () => {
  const c = new ITGlueApi();
  expect(c.name).toBe('itglueApi');
  const names = c.properties.map(p => p.name);
  expect(names).toEqual(expect.arrayContaining(['region', 'apiKey']));
  expect(c.authenticate.properties.headers!['x-api-key']).toBe('={{$credentials.apiKey}}');
  expect(c.test.request.url).toBe('/organizations');
});
```

- [ ] **Step 2: Run → FAIL** (`Cannot find module './ITGlueApi.credentials'`). `npx jest credentials -t 'x-api-key'`

- [ ] **Step 3: Implement** `ITGlueApi.credentials.ts`: `name='itglueApi'`, `displayName='IT Glue API'`, properties `region` (options US=`api`, EU=`api.eu`, AU=`api.au`, default `api`) and `apiKey` (string, `typeOptions.password=true`). `authenticate` generic: headers `x-api-key: ={{$credentials.apiKey}}`, `Content-Type: application/vnd.api+json`, `User-Agent: n8n-nodes-itglue-extended`. `test.request`: `baseURL: ={{"https://" + $credentials.region + ".itglue.com"}}`, `url: '/organizations'`, `method: 'GET'`, `qs: { 'page[size]': 1 }`.

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit** `git add -A && git commit -m "Add ITGlueApi credential (region + apiKey, x-api-key auth)" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"`

### Task 3: Test fake context helper

**Files:**
- Create: `nodes/ITGlue/__testutils__/makeCtx.ts`

- [ ] **Step 1: Implement** a factory returning a partial `IExecuteFunctions`:

```ts
import { IDataObject } from 'n8n-workflow';

export function makeCtx(opts: {
  params?: Record<string, unknown>;
  credentials?: IDataObject;
  httpResponses?: IDataObject[];          // queued responses returned in order
  mode?: string;                          // execution mode, default 'manual'
  isTool?: boolean;                       // simulate AI-tool invocation
} = {}) {
  const responses = [...(opts.httpResponses ?? [])];
  const calls: any[] = [];
  const ctx: any = {
    getInputData: () => [{ json: {} }],
    getNode: () => ({ name: 'IT Glue', type: 'itGlue', parameters: opts.isTool ? { __isToolCall: true } : {} }),
    getMode: () => opts.mode ?? 'manual',
    continueOnFail: () => false,
    getNodeParameter: (n: string, _i: number, d?: unknown) =>
      (opts.params && n in opts.params) ? opts.params[n] : d,
    getCredentials: async () => opts.credentials ?? { region: 'api', apiKey: 'k' },
    helpers: {
      httpRequestWithAuthentication: async (_c: string, o: any) => { calls.push(o); return responses.shift() ?? { data: [] }; },
      httpRequest: async (o: any) => { calls.push(o); return responses.shift() ?? { data: [] }; },
      returnJsonArray: (d: any) => (Array.isArray(d) ? d : [d]).map((j: any) => ({ json: j })),
    },
    additionalData: opts.isTool ? { isToolExecution: true } : {},
    _calls: calls,
  };
  return ctx;
}
```

- [ ] **Step 2: Commit** `git add -A && git commit -m "Add makeCtx test fake for n8n execution context" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"`

### Task 4: JSON:API helpers

**Files:**
- Create: `nodes/ITGlue/engine/jsonapi.ts`
- Test: `nodes/ITGlue/engine/jsonapi.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { camelToKebab, kebabToCamel, buildJsonApiBody, flattenResource } from './jsonapi';

test('camel/kebab round trip', () => {
  expect(camelToKebab('organizationId')).toBe('organization-id');
  expect(kebabToCamel('organization-id')).toBe('organizationId');
});

test('buildJsonApiBody wraps type + attributes + optional id/relationships', () => {
  expect(buildJsonApiBody('passwords', { name: 'x' }, undefined, '7')).toEqual({
    data: { type: 'passwords', id: '7', attributes: { name: 'x' } },
  });
});

test('flattenResource lifts attributes and keeps id/type/relationships', () => {
  expect(flattenResource({ id: '1', type: 'passwords', attributes: { 'user-name': 'a' }, relationships: { x: 1 } }))
    .toEqual({ id: '1', type: 'passwords', userName: 'a', relationships: { x: 1 } });
});
```

- [ ] **Step 2: Run → FAIL.** `npx jest engine/jsonapi`

- [ ] **Step 3: Implement** `jsonapi.ts`:
  - `camelToKebab(s)`: `s.replace(/([A-Z])/g,'-$1').toLowerCase()`
  - `kebabToCamel(s)`: `s.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())`
  - `buildJsonApiBody(type, attributes, relationships?, id?)`: returns `{ data: { type, ...(id?{id}:{}), attributes, ...(relationships?{relationships}:{}) } }`
  - `flattenResource(item)`: `{ id, type, ...mapKeys(attributes, kebabToCamel), ...(relationships?{relationships}:{}) }`

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit** `git add -A && git commit -m "Add JSON:API (de)serialisation helpers" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"`

### Task 5: Secret redaction

**Files:**
- Create: `nodes/ITGlue/engine/redact.ts`
- Test: `nodes/ITGlue/engine/redact.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { redactSecrets, REDACTED } from './redact';

test('redacts password / otp / *-password recursively, preserves other fields', () => {
  const out = redactSecrets([{ id: '1', password: 'p', 'otp-secret': 's', name: 'ok', child: { 'admin-password': 'q' } }]);
  expect(out).toEqual([{ id: '1', password: REDACTED, 'otp-secret': REDACTED, name: 'ok', child: { 'admin-password': REDACTED } }]);
});

test('non-secret object untouched', () => {
  expect(redactSecrets({ a: 1 })).toEqual({ a: 1 });
});
```

- [ ] **Step 2: Run → FAIL.** `npx jest engine/redact`

- [ ] **Step 3: Implement** `redact.ts`: export `REDACTED='***REDACTED***'` and `redactSecrets(v)` (pure deep-clone, recurses arrays/plain objects, secret key ⇒ value→`REDACTED` regardless of value type, prototype-pollution safe via `Object.defineProperty`).
  - **CORRECTED (security review, commit `0f69ee4`):** detection MUST be casing/separator-agnostic because `flattenResource` camelCases IT Glue's kebab attributes *before* redaction runs. Normalize each key with `key.replace(/[-_]/g,'').toLowerCase()`, then: `NON_SECRET_KEY_RE = /^(passwords|passwordcategory(id|name)?|passwordfolder(id|name)?|password(updated|created|changed|recorded)(at|by)?|passwordresetat|otpenabled)$/` ⇒ NOT secret (handler needs these; `passwords` is a JSON:API relationship key); else bare `password`/`otp` ⇒ secret; else `SECRET_KEY_RE = /(password|passphrase|otpsecret|onetimepassword)/i` ⇒ secret. Do NOT broaden to generic `secret`/`key`/`token` (flexible-asset traits are user-named). The old separator-anchored regex `/(^|[-_])...($|[-_])/i` is SUPERSEDED — it leaked compound `*-password`/`*-otp` post-flatten.

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit** `git add -A && git commit -m "Add recursive secret redactor" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"`

### Task 6: Transport — single request + URL join + error mapping

**Files:**
- Create: `nodes/ITGlue/transport/errors.ts`, `nodes/ITGlue/transport/request.ts`
- Test: `nodes/ITGlue/transport/request.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { itGlueApiRequest } from './request';
import { makeCtx } from '../__testutils__/makeCtx';

test('builds single-slash URL and returns body', async () => {
  const ctx = makeCtx({ httpResponses: [{ data: { id: '1' } }] });
  const res = await itGlueApiRequest.call(ctx, 'GET', 'passwords', {}, { a: 1 });
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/passwords');
  expect(ctx._calls[0].qs).toEqual({ a: 1 });
  expect(res).toEqual({ data: { id: '1' } });
});

test('leading slash in resource does not double', async () => {
  const ctx = makeCtx({ httpResponses: [{ data: [] }] });
  await itGlueApiRequest.call(ctx, 'GET', '/passwords');
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/passwords');
});

test('maps 401 to actionable NodeApiError', async () => {
  const ctx = makeCtx();
  ctx.helpers.httpRequestWithAuthentication = async () => { const e: any = new Error('x'); e.response = { status: 401, data: { errors: [{ detail: 'bad key' }] } }; throw e; };
  await expect(itGlueApiRequest.call(ctx, 'GET', 'passwords')).rejects.toThrow(/Authentication failed|bad key/);
});
```

- [ ] **Step 2: Run → FAIL.** `npx jest transport/request`

- [ ] **Step 3: Implement** `errors.ts`: `toNodeError(ctx, error)` → `NodeApiError` with message `IT Glue API Error (<status>): <errors[0].detail||message>`; special actionable text for 401 (auth), 403 (permissions), 429 (rate limit). `request.ts`: `itGlueApiRequest(method, resource, body={}, qs={})`: read creds, `url = `https://${region}.itglue.com/` + resource.replace(/^\/+/, '')`; headers Accept `application/json`; `json:true`; body only if non-empty; call `httpRequestWithAuthentication('itglueApi', options)`; on throw → `toNodeError`.

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit** `git add -A && git commit -m "Add transport request + error mapping (single-slash URL)" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"`

### Task 7: Transport — 429 backoff + pagination

**Files:**
- Create: `nodes/ITGlue/transport/rateLimit.ts`
- Modify: `nodes/ITGlue/transport/request.ts` (add `itGlueApiRequestAllItems`, wrap with retry)
- Test: `nodes/ITGlue/transport/rateLimit.test.ts`, append to `request.test.ts`

- [ ] **Step 1: Failing tests**

```ts
test('retries once on 429 then succeeds', async () => {
  const ctx = makeCtx();
  let n = 0;
  ctx.helpers.httpRequestWithAuthentication = async () => {
    if (n++ === 0) { const e: any = new Error('rl'); e.response = { status: 429, headers: { 'retry-after': '0' } }; throw e; }
    return { data: [{ id: '1' }] };
  };
  const { itGlueApiRequest } = require('./request');
  const res = await itGlueApiRequest.call(ctx, 'GET', 'passwords');
  expect(res).toEqual({ data: [{ id: '1' }] });
  expect(n).toBe(2);
});

test('apiRequestAllItems aggregates pages and stops on short page', async () => {
  const page1 = { data: Array.from({ length: 1000 }, (_, i) => ({ id: String(i) })) };
  const page2 = { data: [{ id: '1000' }] };
  const ctx = makeCtx({ httpResponses: [page1, page2] });
  const { itGlueApiRequestAllItems } = require('./request');
  const all = await itGlueApiRequestAllItems.call(ctx, 'GET', 'passwords');
  expect(all).toHaveLength(1001);
});
```

- [ ] **Step 2: Run → FAIL.** `npx jest transport`

- [ ] **Step 3: Implement** `rateLimit.ts`: `withRetry(fn, {retries=3})` — calls `fn`; on error with `response.status===429`, sleep `max(Number(retry-after||1),1)*1000` ms (use injectable `sleep` defaulting to real), retry up to `retries`, else rethrow. Wrap the request in `request.ts` with `withRetry`. Add `itGlueApiRequestAllItems(method, resource, body, qs)`: set `qs['page[size]'] = qs['page[size]']||1000`, `qs['page[number]']=1`; loop calling `itGlueApiRequest`, concat `data`, stop when page length < pageSize or 0; safety cap 200 pages → `NodeOperationError` suggesting filters.

- [ ] **Step 4: Run → PASS** (use fake `sleep` via module mock so test is instant).

- [ ] **Step 5: Commit** `git add -A && git commit -m "Add 429 backoff retry + JSON:API pagination" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"`

---

## Phase 3 — Registry types & generic engine

### Task 8: Registry types

**Files:**
- Create: `nodes/ITGlue/registry/types.ts`
- Test: `nodes/ITGlue/registry/types.test.ts` (compile-only guard)

- [ ] **Step 1: Implement** `types.ts` exactly:

```ts
import { INodePropertyOptions } from 'n8n-workflow';

export type OperationName =
  | 'getAll' | 'get' | 'create' | 'update' | 'delete' | 'bulkUpdate' | 'bulkDelete';

export interface FieldDescriptor {
  name: string;                 // n8n param (camelCase)
  attribute: string;            // JSON:API attribute (kebab-case)
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'dateTime' | 'options' | 'json';
  required?: boolean;
  default?: unknown;
  description?: string;
  loadOptionsMethod?: string;
  options?: INodePropertyOptions[];
  onOperations?: OperationName[]; // default ['create','update']
  secret?: boolean;
  password?: boolean;           // mask input in UI
}

export interface ResourceDescriptor {
  name: string;                 // resource value e.g. 'password'
  displayName: string;          // 'Password'
  jsonApiType: string;          // 'passwords'
  endpoint: string;             // 'passwords'
  idParam?: string;             // default `${name}Id`
  operations: OperationName[];
  orgScoped?: boolean;          // offer "Scope to Organization"
  fields: FieldDescriptor[];
  filters?: FieldDescriptor[];
  includes?: string[];
  special?: 'passwords' | 'flexibleAssets' | 'attachments' | 'relatedItems' | 'exports' | 'documents';
  gated?: boolean;              // excluded from resource list until live-verified
}
```

- [ ] **Step 2: Test** — a `.test.ts` that imports the types and constructs a minimal valid `ResourceDescriptor` literal (compile-time check; assert `true`).

- [ ] **Step 3: Run → PASS.** `npx jest registry/types`

- [ ] **Step 4: Commit** `git add -A && git commit -m "Add registry type contracts" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"`

### Task 9: Property generation from a descriptor

**Files:**
- Create: `nodes/ITGlue/engine/properties.ts`
- Test: `nodes/ITGlue/engine/properties.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { buildResourceProperties } from './properties';
import { ResourceDescriptor } from '../registry/types';

const d: ResourceDescriptor = {
  name: 'contactType', displayName: 'Contact Type', jsonApiType: 'contact_types',
  endpoint: 'contact_types', operations: ['getAll','get','create','update'],
  fields: [{ name: 'name', attribute: 'name', displayName: 'Name', type: 'string', required: true }],
};

test('emits operation dropdown scoped to the resource', () => {
  const props = buildResourceProperties(d);
  const op = props.find(p => p.name === 'operation')!;
  expect(op.displayOptions!.show!.resource).toEqual(['contactType']);
  expect((op.options as any[]).map(o => o.value).sort()).toEqual(['create','get','getAll','update']);
});

test('required field shows only for create+update by default', () => {
  const props = buildResourceProperties(d);
  const name = props.find(p => p.name === 'name')!;
  expect(name.displayOptions!.show!.operation).toEqual(['create','update']);
  expect(name.required).toBe(true);
});

test('get/delete add an id param; getAll adds returnAll+limit', () => {
  const props = buildResourceProperties(d);
  expect(props.some(p => p.name === 'contactTypeId')).toBe(true);
  expect(props.some(p => p.name === 'returnAll')).toBe(true);
});
```

- [ ] **Step 2: Run → FAIL.** `npx jest engine/properties`

- [ ] **Step 3: Implement** `buildResourceProperties(d)`:
  - operation `options` node-property (`displayOptions.show.resource=[d.name]`), one option per `d.operations` with map: `getAll`→{name:'Get Many',action:`Get many ${d.displayName} records`}, `get`→'Get', `create`→'Create', `update`→'Update', `delete`→'Delete', `bulkUpdate`→'Bulk Update', `bulkDelete`→'Bulk Delete'; each option `description` LLM-grade (e.g. `Retrieve a single ${d.displayName} by ID`).
  - id param `${d.idParam ?? d.name+'Id'}` shown for `get`,`update`,`delete`.
  - each `FieldDescriptor` → `INodeProperties` (type mapped; `typeOptions.password` when `field.password`), shown for `field.onOperations ?? ['create','update']`, scoped to `resource=[d.name]`.
  - `getAll`: add `returnAll` (boolean) and `limit` (number, shown when `!returnAll`).
  - if `d.filters`: a `filters` `collection` shown on `getAll`. If `d.includes`: an `include` `multiOptions` shown on `get`/`getAll`.
  - if `d.orgScoped`: add optional `organizationId` (string) shown on `create`/`getAll`.

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit** `git add -A && git commit -m "Add registry-to-properties generator" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"`

### Task 10: Generic CRUD execute

**Files:**
- Create: `nodes/ITGlue/engine/crud.ts`
- Test: `nodes/ITGlue/engine/crud.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { executeGeneric } from './crud';
import { makeCtx } from '../__testutils__/makeCtx';
import { ResourceDescriptor } from '../registry/types';

const d: ResourceDescriptor = {
  name: 'contactType', displayName: 'Contact Type', jsonApiType: 'contact_types',
  endpoint: 'contact_types', operations: ['getAll','get','create','update','delete'],
  fields: [{ name: 'name', attribute: 'name', displayName: 'Name', type: 'string', required: true }],
};

test('create builds JSON:API POST body and returns flattened', async () => {
  const ctx = makeCtx({ params: { operation: 'create', name: 'VIP' }, httpResponses: [{ data: { id: '9', type: 'contact_types', attributes: { name: 'VIP' } } }] });
  const out = await executeGeneric.call(ctx, d, 0);
  expect(ctx._calls[0].method).toBe('POST');
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/contact_types');
  expect(ctx._calls[0].body).toEqual({ data: { type: 'contact_types', attributes: { name: 'VIP' } } });
  expect(out[0].json).toEqual({ id: '9', type: 'contact_types', name: 'VIP' });
});

test('get hits /<endpoint>/<id>', async () => {
  const ctx = makeCtx({ params: { operation: 'get', contactTypeId: '5' }, httpResponses: [{ data: { id: '5', type: 'contact_types', attributes: {} } }] });
  await executeGeneric.call(ctx, d, 0);
  expect(ctx._calls[0].url).toBe('https://api.itglue.com/contact_types/5');
});

test('delete issues DELETE and returns {success:true,id}', async () => {
  const ctx = makeCtx({ params: { operation: 'delete', contactTypeId: '5' }, httpResponses: [{}] });
  const out = await executeGeneric.call(ctx, d, 0);
  expect(ctx._calls[0].method).toBe('DELETE');
  expect(out[0].json).toEqual({ success: true, id: '5' });
});
```

- [ ] **Step 2: Run → FAIL.** `npx jest engine/crud`

- [ ] **Step 3: Implement** `executeGeneric(d, index)`:
  - read `operation`.
  - build `attributes` from `d.fields` whose `onOperations` includes the op (default create/update): for each present param, `attributes[field.attribute] = value`.
  - `getAll`: qs from `filters` collection (`filter[<attr>]`), `include` joined, `sort`; `returnAll` → `itGlueApiRequestAllItems` else `page[size]=limit` + `itGlueApiRequest`; map results via `flattenResource`.
  - `get`: `GET <endpoint>/<id>` (+`include`); return `[flattenResource(data)]`.
  - `create`: `POST <endpoint>` (or org-scoped `organizations/<orgId>/relationships/<endpoint>` when `d.orgScoped` and orgId set) body `buildJsonApiBody(jsonApiType, attributes)`; return `[flattenResource(data)]`.
  - `update`: `PATCH <endpoint>/<id>` body `buildJsonApiBody(jsonApiType, attributes, undefined, id)`.
  - `delete`: `DELETE <endpoint>/<id>` → `[{success:true,id}]`.
  - `bulkUpdate`/`bulkDelete`: `PATCH`/`DELETE <endpoint>` with `data` array from a `bulkItems` JSON param.
  - return `INodeExecutionData[]` via `returnJsonArray`.

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit** `git add -A && git commit -m "Add generic CRUD execute engine" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"`

---

## Phase 4 — Special handlers (the deviating resources)

### Task 11: Reveal gate (fail-closed) — security critical

**Files:**
- Create: `nodes/ITGlue/engine/revealGate.ts`
- Test: `nodes/ITGlue/engine/revealGate.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { isToolExecution, canRevealPlaintext } from './revealGate';
import { makeCtx } from '../__testutils__/makeCtx';

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
```

- [ ] **Step 2: Run → FAIL.** `npx jest engine/revealGate`

- [ ] **Step 3: Implement** `revealGate.ts`:
  - `SAFE_MODES = ['manual','trigger','webhook','retry','cli','integrated','internal']`.
  - **CORRECTED (opus security review, commit `2f3d149`):** The original `getMode() ∈ SAFE_MODES` design was UNSOUND — verified against installed `n8n-workflow@2.16.0`: there is no `'tool'` execution mode; an AI-Agent tool sub-execution of a `usableAsTool` node runs `execute()` under the ambient mode (`manual`/`webhook`/`trigger`/`integrated`, all in SAFE_MODES), so SAFE_MODES membership is NOT positive proof and would have leaked plaintext to the LLM. The pinned runtime exposes the official `IExecuteFunctions.isToolExecution(): boolean` ("Returns true if the node is being executed as an AI Agent tool"). `isToolExecution(ctx)` returns `false` (positively not a tool) ONLY when ALL hold, else `true`: (1) no fabricated marker truthy (`getNode().parameters.__isToolCall`, `additionalData.{isToolExecution,aiTool,isTool}` — kept as belt-and-braces, non-load-bearing); (2) `typeof ctx.isToolExecution === 'function'` (method ABSENT ⇒ `true`, fail closed for old/unknown runtime — presence is the version gate); (3) `ctx.isToolExecution() === false` strict (`true`/`undefined`/non-false/throw ⇒ `true`); (4) `getMode()` ∈ SAFE_MODES (necessary-but-insufficient, layered on top). Any throw ⇒ `true`. `makeCtx` updated to model real n8n: `isToolExecution: () => !!opts.isTool`.
  - `canRevealPlaintext(ctx,i)`: `ctx.getNodeParameter('revealPlaintext', i, false) === true` (strict boolean) **and** `isToolExecution(ctx) === false`.

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit** `git add -A && git commit -m "Add fail-closed plaintext reveal gate (security critical)" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"`

### Task 12: Password special handler

**Files:**
- Create: `nodes/ITGlue/resources/special/passwords.ts`
- Test: `nodes/ITGlue/resources/special/passwords.test.ts`

- [ ] **Step 1: Failing test**

```ts
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
  expect(ctx._calls[0].body.data.attributes.password).toBe('p');           // input still sent
  expect((out[0].json as any).password).toBe(REDACTED);                    // response redacted
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
```

- [ ] **Step 2: Run → FAIL.** `npx jest resources/special/passwords`

- [ ] **Step 3: Implement** `executePassword(index)`:
  - ops: `getAll | get | create | update | delete | archive | restore | getVersions | getVersion`.
  - `reveal = (op === 'get' || op === 'getVersion') && canRevealPlaintext(ctx, index)`. Bulk-ish ops (`getAll`,`getVersions`) → `reveal=false` always.
  - Only when `reveal` true: add `qs.show_password = true`.
  - `create`/`update`: build `passwords` JSON:API body from inputs (name, username, password, url, notes, password-category-id, password-folder-id, restricted, otp-secret, organization-id; org-scoped POST `organizations/<orgId>/relationships/passwords` when orgId given).
  - `archive`/`restore`: `PATCH passwords/<id>` with attributes `{ archived: true|false }`.
  - `getVersions`: `GET passwords/<id>/relationships/password_versions` (paginated); `getVersion`: `GET password_versions/<versionId>`.
  - Post-process: `flattenResource`; if `reveal` → attach `_passwordRevealed:true` (no redact); else → `redactSecrets` and attach `_passwordRedactedReason: isToolExecution(ctx)?'blocked in AI/tool context':'reveal not enabled'`. (Note: `redactSecrets` is casing-agnostic as of `0f69ee4`, so redacting *after* `flattenResource` is correct and safe — the camelCase keys are still caught.)
  - **DEFENSE-IN-DEPTH (required by opus security review of Task 11):** `canRevealPlaintext` is the single point of failure for reveal, so Task 12 must NOT trust a stale/earlier-computed reveal value. Re-assert immediately before composing the IT Glue request AND before returning: compute `reveal` once via `canRevealPlaintext(ctx, index)`; additionally, as an independent backstop, if `(ctx as any).isToolExecution?.() !== false` then FORCE `redactSecrets` on the outgoing item and never send `show_password=true`, regardless of `reveal`. Add a test: ctx with `isToolExecution: () => true` + `getMode: () => 'manual'` + `revealPlaintext:true` ⇒ output redacted, `_passwordRedactedReason` set, no `show_password` in `qs`.
  - return via `returnJsonArray`.

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit** `git add -A && git commit -m "Add secret-safe password handler (fail-closed reveal)" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"`

### Task 13: Attachments handler (any parent, binary→base64)

**Files:**
- Create: `nodes/ITGlue/resources/special/attachments.ts`
- Test: `nodes/ITGlue/resources/special/attachments.test.ts`

- [ ] **Step 1: Failing test**

```ts
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
```

- [ ] **Step 2: Run → FAIL.** `npx jest resources/special/attachments`

- [ ] **Step 3: Implement** `executeAttachment(index)`: param `resourceType` (options: configurations, contacts, documents, domains, locations, passwords, flexible_assets, ssl_certificates, checklists, checklist_templates, tickets), `resourceId`. Base path `${resourceType}/${resourceId}/relationships/attachments`. `getAll` GET (paginate), `get` GET `/<id>`, `create` POST with `buildJsonApiBody('attachments',{ 'attachment': fileBase64 || <read n8n binary by `binaryPropertyName` → base64>, name: fileName })`, `update` PATCH `/<id>` `{name}`, `delete`/`bulkDelete` DELETE. Flatten results. (No secrets; no redaction needed.)

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit** `git add -A && git commit -m "Add attachments handler (any parent, binary upload)" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"`

### Task 14: Flexible Assets handler (dynamic trait fields)

**Files:**
- Create: `nodes/ITGlue/resources/special/flexibleAssets.ts`
- Test: `nodes/ITGlue/resources/special/flexibleAssets.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { executeFlexibleAsset } from './flexibleAssets';
import { makeCtx } from '../../__testutils__/makeCtx';

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
```

- [ ] **Step 2: Run → FAIL.** `npx jest resources/special/flexibleAssets`

- [ ] **Step 3: Implement** `executeFlexibleAsset(index)`: ops getAll/get/create/update/delete/bulkDelete. For create/update: read `flexibleAssetTypeId`, `organizationId`, and a `fixedCollection` `traits.trait[]` of `{name,value}`; fold into `traits` object; body `buildJsonApiBody('flexible-assets', { 'flexible-asset-type-id', 'organization-id', traits }, undefined, idForUpdate)`. getAll requires `filter[flexible-asset-type-id]` (validate present → `NodeOperationError` if missing). Flatten results. (loadOptions `getFlexibleAssetTypes` + `getFlexibleAssetTypeFields` wired in Task 16.)

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit** `git add -A && git commit -m "Add flexible assets handler (dynamic traits)" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"`

### Task 15: Related Items, Exports (poll), Documents handlers

**Files:**
- Create: `nodes/ITGlue/resources/special/relatedItems.ts`, `exports.ts`, `documents.ts`
- Test: matching `*.test.ts` for each

- [ ] **Step 1: Failing tests** (one per handler):
  - `relatedItems`: `create` POST `<resourceType>/<resourceId>/relationships/related_items` with `{ destination-id, destination-type }`; `update` PATCH `/<id>`; `bulkDelete` DELETE. Assert URL + body shape.
  - `exports`: `create` POST `exports`; `get` GET `exports/<id>`; `getAll` list; `delete` DELETE; plus `createAndWait` — POST then poll `exports/<id>` (inject `sleep`) until `attributes.status` is `completed`/`failed`, return final. Assert it polls until completed.
  - `documents`: subresource selector `documentResource` ∈ {document, section, image}; map to `documents`, `document_sections`, `document_images`; ops getAll/get/create/update/delete plus document `publish` (PATCH `documents/<id>` `{ published: true }`). Assert endpoints.

- [ ] **Step 2: Run → FAIL.** `npx jest resources/special`

- [ ] **Step 3: Implement** all three per the assertions above. Use `itGlueApiRequest`/`AllItems`, `buildJsonApiBody`, `flattenResource`. `exports.createAndWait` uses injectable `sleep` (default real, mocked in test) with a max-poll cap → `NodeOperationError` on exceed.

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit** `git add -A && git commit -m "Add relatedItems, exports(poll), documents handlers" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"`

---

## Phase 5 — Registry data, loadOptions, node wiring

### Task 16: loadOptions

**Files:**
- Create: `nodes/ITGlue/methods/loadOptions.ts`, `nodes/ITGlue/methods/index.ts`
- Test: `nodes/ITGlue/methods/loadOptions.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { loadOptions } from './index';
import { makeCtx } from '../__testutils__/makeCtx';

test('getOrganizations maps id+name and sorts', async () => {
  const ctx = makeCtx({ httpResponses: [{ data: [{ id: '2', attributes: { name: 'Beta' } }, { id: '1', attributes: { name: 'Alpha' } }] }] });
  const r = await loadOptions.getOrganizations.call(ctx);
  expect(r).toEqual([{ name: 'Alpha', value: '1' }, { name: 'Beta', value: '2' }]);
});
```

- [ ] **Step 2: Run → FAIL.** `npx jest methods/loadOptions`

- [ ] **Step 3: Implement** one generic `makeLoader(endpoint)` returning `{name:attributes.name,value:id}` sorted; export `loadOptions` object with `getOrganizations`, `getOrganizationTypes`, `getOrganizationStatuses`, `getConfigurationTypes`, `getConfigurationStatuses`, `getContactTypes`, `getPasswordCategories`, `getPasswordFolders`, `getFlexibleAssetTypes`, `getLocations`, `getManufacturers`, `getModels`, `getOperatingSystems`, and `getFlexibleAssetTypeFields` (reads `flexibleAssetTypeId` via `this.getCurrentNodeParameter`, GETs `flexible_asset_types/<id>/relationships/flexible_asset_fields`, maps name→value). Single file; no duplicate/dead variant.

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit** `git add -A && git commit -m "Add consolidated loadOptions" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"`

### Task 17: Registry — stable resource descriptors

**Files:**
- Create: `nodes/ITGlue/registry/resources/<name>.ts` (one per resource), `nodes/ITGlue/registry/index.ts`
- Test: `nodes/ITGlue/registry/index.test.ts`

Build a `ResourceDescriptor` for **every** stable resource below. Fields use kebab-case `attribute`; relationship IDs use `loadOptionsMethod`. `operations` reflect what IT Glue supports.

| name | jsonApiType / endpoint | operations | orgScoped | special | key fields (attribute) |
|---|---|---|---|---|---|
| organization | organizations | getAll,get,create,update,delete,bulkDelete | — | — | name, description, organization-type-id(loadOpts), organization-status-id(loadOpts), alert, quick-notes |
| organizationType | organization_types | getAll,get,create,update | — | — | name |
| organizationStatus | organization_statuses | getAll,get,create,update | — | — | name |
| configuration | configurations | getAll,get,create,update,delete,bulkUpdate | yes | — | name, organization-id, configuration-type-id(loadOpts), configuration-status-id(loadOpts), serial-number, asset-tag, primary-ip, mac-address, hostname, notes, archived |
| configurationInterface | configuration_interfaces | getAll,get,create,update,delete | — | — | configuration-id, name, ip-address, primary, notes |
| configurationStatus | configuration_statuses | getAll,get,create,update | — | — | name |
| configurationType | configuration_types | getAll,get,create,update | — | — | name |
| contact | contacts | getAll,get,create,update,delete,bulkDelete | yes | — | organization-id, first-name, last-name, title, contact-type-id(loadOpts), notes, important |
| contactType | contact_types | getAll,get,create,update | — | — | name |
| country | countries | getAll,get | — | — | (read-only) |
| domain | domains | getAll,get | — | — | (read-only; filter organization-id) |
| expiration | expirations | getAll,get | — | — | (read-only) |
| group | groups | getAll,get,create,update,delete | — | — | name |
| location | locations | getAll,get,create,update,delete,bulkDelete | yes | — | organization-id, name, address-1, city, region-id, country-id, postal-code, phone |
| log | logs | getAll | — | — | (read-only; filters) |
| manufacturer | manufacturers | getAll,get,create,update | — | — | name |
| model | models | getAll,get,create,update,bulkUpdate | — | — | name, manufacturer-id(loadOpts) |
| operatingSystem | operating_systems | getAll,get | — | — | (read-only) |
| platform | platforms | getAll,get | — | — | (read-only) |
| region | regions | getAll,get | — | — | (read-only) |
| user | users | getAll,get,update | — | — | first-name, last-name, email, role-name |
| userMetric | user_metrics | getAll | — | — | (read-only; filters) |
| passwordCategory | password_categories | getAll,get,create,update | — | — | name |
| flexibleAssetField | flexible_asset_fields | getAll,get,create,update,delete,bulkUpdate | — | — | flexible-asset-type-id, name, kind, order, required |
| flexibleAssetType | flexible_asset_types | getAll,get,create,update | — | — | name, description, icon, enabled |
| password | passwords | getAll,get,create,update,delete,archive,restore,getVersions,getVersion | yes | passwords | (see Task 12) |
| flexibleAsset | flexible_assets | getAll,get,create,update,delete,bulkDelete | yes | flexibleAssets | (see Task 14) |
| attachment | attachments | getAll,get,create,update,delete,bulkDelete | — | attachments | (see Task 13) |
| relatedItem | related_items | create,update,bulkDelete | — | relatedItems | (see Task 15) |
| export | exports | getAll,get,create,delete | — | exports | (see Task 15) |
| document | documents | getAll,get,create,update,delete,publish | — | documents | (see Task 15) |

Add `includes`/`filters` per resource from the IT Glue developer docs (e.g. configuration includes: `configuration_interfaces, attachments, passwords, related_items, recent_versions`; common filters: `id,name,organization-id`).

- [ ] **Step 1: Failing registry test**

```ts
import { registry, enabledResources } from './index';

test('registry has every stable resource and unique names/types', () => {
  const names = registry.map(r => r.name);
  expect(new Set(names).size).toBe(names.length);
  for (const n of ['organization','configuration','password','flexibleAsset','attachment','contact','document','export','relatedItem','user','log']) {
    expect(names).toContain(n);
  }
});
test('every descriptor: non-empty operations, kebab attributes, jsonApiType set', () => {
  for (const r of registry) {
    expect(r.operations.length).toBeGreaterThan(0);
    expect(r.jsonApiType).toBeTruthy();
    for (const f of r.fields) expect(f.attribute).toBe(f.attribute.toLowerCase());
  }
});
test('gated resources excluded from enabledResources by default', () => {
  expect(enabledResources.every(r => !r.gated)).toBe(true);
});
```

- [ ] **Step 2: Run → FAIL.** `npx jest registry/index`

- [ ] **Step 3: Implement** each descriptor file + `index.ts` exporting `registry: ResourceDescriptor[]` (all) and `enabledResources = registry.filter(r => !r.gated)`.

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit** `git add -A && git commit -m "Add stable resource registry descriptors" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"`

### Task 18: Node class + dispatcher

**Files:**
- Create: `nodes/ITGlue/ITGlue.node.ts`, `nodes/ITGlue/ITGlue.node.json`, `nodes/ITGlue/engine/dispatch.ts`
- Copy: `nodes/ITGlue/itglue.svg` from reference repo
- Test: `nodes/ITGlue/engine/dispatch.test.ts`, `nodes/ITGlue/ITGlue.node.test.ts`

- [ ] **Step 1: Failing tests**

```ts
// dispatch.test.ts
import { dispatch } from './dispatch';
import { makeCtx } from '../__testutils__/makeCtx';
test('routes special resources to their handler, generic otherwise', async () => {
  const ctx = makeCtx({ params: { resource: 'contactType', operation: 'getAll', returnAll: false, limit: 1 }, httpResponses: [{ data: [] }] });
  const out = await dispatch.call(ctx, 0);
  expect(Array.isArray(out)).toBe(true);
});

// ITGlue.node.test.ts
import { ITGlue } from './ITGlue.node';
test('node is usableAsTool and lists only enabled resources', () => {
  const n = new ITGlue();
  expect(n.description.usableAsTool).toBe(true);
  const resourceProp = n.description.properties.find(p => p.name === 'resource')!;
  const vals = (resourceProp.options as any[]).map(o => o.value);
  expect(vals).toContain('password');
  expect(vals).not.toContain('ticket'); // gated until verified
});
```

- [ ] **Step 2: Run → FAIL.** `npx jest engine/dispatch ITGlue.node`

- [ ] **Step 3: Implement**
  - `dispatch(index)`: read `resource`; find descriptor in `registry`; if `descriptor.special` → call the matching handler from a `specialHandlers` map (`passwords→executePassword`, etc.); else `executeGeneric(descriptor, index)`.
  - `ITGlue.node.ts`: `description` with `displayName:'IT Glue'`, `name:'itGlue'`, `icon:'file:itglue.svg'`, `group:['transform']`, `version:1`, `usableAsTool:true`, `subtitle`, credentials `itglueApi` required, `inputs/outputs Main`. `properties`: resource `options` from `enabledResources` (sorted) then `...enabledResources.flatMap(buildResourceProperties)`. `methods = { loadOptions }`. `execute()`: loop `getInputData`, `dispatch.call(this,i)`, push results; honour `continueOnFail()` (error attached to item, `pairedItem:i`); always emit non-empty json per item (mitigate n8n #26202: on empty result push `{ json: { found: 0, resource, operation } }`).
  - **SECURITY (required by opus review of Task 11):** `execute()` must call handlers with the REAL `IExecuteFunctions` (`dispatch.call(this, i)` — do NOT wrap/adapt `this` in anything that drops the `isToolExecution()` method; the reveal gate depends on it). Add an integration test: a node-level fake context with `isToolExecution: () => true` and `getMode: () => 'manual'`, password get, `revealPlaintext:true` ⇒ asserts the emitted item is redacted (no plaintext) — this test must fail if the context is ever adapted in a way that hides the official signal.
  - `ITGlue.node.json`: correct codex (`"node": "n8n-nodes-itglue-extended.itGlue"`, category `["Miscellaneous"]`, doc URLs → the GitHub README).

- [ ] **Step 4: Run → PASS**, then `npm run lint` (fix any n8n-nodes-base findings), `npm run build`.

- [ ] **Step 5: Commit** `git add -A && git commit -m "Add IT Glue node class + dispatcher (usableAsTool)" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"`

---

## Phase 6 — Verification gate, docs, release prep

### Task 19: Gated resource descriptors + live-verification script

**Files:**
- Create: `nodes/ITGlue/registry/resources/gated/{passwordFolder,sslCertificate,checklist,checklistTask,checklistTemplate,ticket,networkGlue,copilot}.ts`
- Create: `scripts/verify-endpoints.ts` (manual, never imports into node build)
- Modify: `nodes/ITGlue/registry/index.ts` (register gated descriptors with `gated:true`)
- Test: `nodes/ITGlue/registry/gated.test.ts`

- [ ] **Step 1: Failing test** — assert each gated descriptor exists with `gated:true` and is **absent** from `enabledResources`.

- [ ] **Step 2: Run → FAIL.** `npx jest registry/gated`

- [ ] **Step 3: Implement** gated descriptors (same shape; best-effort endpoints: `password_folders`, `ssl_certificates`, `checklists`, `checklist_tasks`, `checklist_templates`, `tickets`, `networks`, `copilot`) all `gated:true`. Write `scripts/verify-endpoints.ts`: reads key from `process.env.ITGLUE_API_KEY` (NOT from any committed file), GETs each gated endpoint `?page[size]=1`, prints `EXISTS`/`MISSING` per endpoint. Never logs the key.

- [ ] **Step 4: Run → PASS** (unit test; script not run yet).

- [ ] **Step 5: Commit** `git add -A && git commit -m "Add gated descriptors + manual endpoint verification script" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"`

- [ ] **Step 6: VERIFICATION CHECKPOINT (requires user).** Pause and ask the user to paste a US-region IT Glue API key. Run: `ITGLUE_API_KEY=<pasted> npx ts-node scripts/verify-endpoints.ts`. Do **not** write the key to disk or echo it back. For each gated endpoint that prints `EXISTS`, flip its descriptor `gated` to `false` (now enabled); delete descriptors that print `MISSING`. Re-run `npx jest` + `npm run build`. Commit: `Enable live-verified endpoints; drop unavailable ones`.

### Task 20: README, CHANGELOG, generated docs, CI

**Files:**
- Create: `README.md`, `CHANGELOG.md`, `docs/<resource>.md` (generated), `scripts/gen-docs.ts`, `.github/workflows/ci.yml`

- [ ] **Step 1:** Write `scripts/gen-docs.ts` that imports `registry` and emits one `docs/<name>.md` per enabled resource (operations table + fields + includes/filters) and `docs/README-matrix.md`. Run it.
- [ ] **Step 2:** Write `README.md`: install, credentials/region setup, full resource/operation matrix (link generated docs), **Password security note** (fail-closed reveal; reveal impossible via AI/tool path; IT Glue Password Access workflow may notify on reveal), **Using with AI Agents** guide (example agent prompts; note the node is `usableAsTool`).
- [ ] **Step 3:** Write `CHANGELOG.md` — `## 2.0.0` documenting the full rewrite, new coverage, and the breaking change vs 1.1.0 (resource/operation names may differ).
- [ ] **Step 4:** Write `.github/workflows/ci.yml`: Node 20, `npm ci`, `npm run lint`, `npm test`, `npm run build`.
- [ ] **Step 5: Final gate** — run `npm run lint && npm test && npm run build`; all green. Commit: `git add -A && git commit -m "Add README, CHANGELOG, generated docs, CI" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"`.

---

## Self-Review

**1. Spec coverage**

| Spec section | Task(s) |
|---|---|
| §1 package v2.0.0 / Earney-IT repo | 1 |
| §2 fixes (no double-slash, no dead types, real UA, codex) | 1, 6, 16, 18 |
| §4.1 credentials | 2 |
| §4.2 transport / pagination / 429 / errors | 6, 7 |
| §4.3 registry + engine | 8, 9, 10, 17, 18 |
| §5 full coverage incl. gated + org-scoped | 17, 19, 9/10 (orgScoped) |
| §6 password fail-closed reveal / lifecycle / versions / folders | 11, 12, 17, 19 |
| §7 flexible assets dynamic fields | 14, 16 |
| §8 attachments any parent + binary | 13 |
| §9 AI tooling / #26202 mitigation / reveal exclusion from $fromAI | 11, 12, 18 |
| §10 error handling / continueOnFail | 6, 18 |
| §11 testing | every task (TDD) |
| §12 docs (generated + README + CHANGELOG) | 20 |
| §13 out of scope | (nothing built — correct) |
| §14 verification gate | 19 (Step 6 checkpoint) |
| §15 phases | Phases 1–6 |

No gaps.

**2. Placeholder scan:** No "TBD/TODO/handle edge cases/similar to Task N". Resource bulk is a complete data table, not a placeholder (the registry is data; the file pattern is fully shown in Tasks 8–10). Reveal-detection field names are flagged for version-confirmation but the behavioral contract (inconclusive ⇒ blocked) is fixed and test-enforced in Task 11 — not a placeholder.

**3. Type consistency:** `ResourceDescriptor`/`FieldDescriptor`/`OperationName` (Task 8) used unchanged in 9, 10, 17, 18. `itGlueApiRequest`/`itGlueApiRequestAllItems` (6, 7) used by all handlers. `buildJsonApiBody`/`flattenResource` (4) used in 10, 12–15. `redactSecrets`/`REDACTED` (5) used in 12. `canRevealPlaintext`/`isToolExecution` (11) used in 12. `loadOptions` (16) referenced by 17/18. Names consistent throughout.
