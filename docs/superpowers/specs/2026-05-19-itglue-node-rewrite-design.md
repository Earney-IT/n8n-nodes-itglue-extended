# IT Glue n8n Node — Comprehensive Rewrite Design

**Date:** 2026-05-19
**Status:** Approved decisions locked; awaiting spec review
**Package:** `n8n-nodes-itglue-extended` → **v2.0.0**
**Author:** Tristen Rice (Earney IT) — `support@earneyit.com`
**Repository:** `https://github.com/Earney-IT/n8n-nodes-itglue-extended`

## 1. Purpose

Replace the current `n8n-nodes-itglue-extended` (v1.1.0) with a clean, comprehensive
rewrite that exposes the **entire IT Glue API** through n8n with full CRUD on every
resource the API supports, first-class password lifecycle (create / update /
versioning / reveal / archive), and strong AI-agent tool support.

Starting reference (reviewed, not reused as-is): `n8n-nodes-itglue` v2.1.0 by
redanthrax (`https://github.com/redanthrax/itglue-node`), the most complete
community node available. Kept at
`/home/tristenrice/n8n-projects/redanthrax-itglue-node-REFERENCE` for reference only.

## 2. Review of the reference node (why a rewrite, not a patch)

Strengths kept: broad resource coverage, router + per-resource layout idea,
`usableAsTool: true`, sane 401/403/429 error mapping, pagination safety cap,
loadOptions dropdowns.

Problems being fixed:

- **Inconsistent architecture.** Some resources use `description/execute/index`
  folders, others flat files; `router.ts` mixes generic dispatch with large
  hand-written `switch` blocks. Fragile and unscalable to ~40 resources.
- **Wrong/dead code.** `types.d.ts` declares `deployment/clientId/clientSecret`
  (credentials actually use `region`+`apiKey`); duplicate dead `loadOptions`
  (`methods/loadOptions.ts` vs `methods/index.ts`); hardcoded stale
  `User-Agent: n8n-itglue-node/0.3.0`; double-slash request URLs
  (`https://api.itglue.com//passwords`); empty/incorrect codex JSON.
- **Password gaps.** `getById` never sends `show_password`, so secrets can't be
  retrieved by automation/AI. No password versioning/history, archive, embedded
  passwords, or password folders.
- **Missing API surface.** No Checklists / Checklist Tasks / Checklist Templates,
  Password Folders, SSL Certificates, Tickets, Network Glue, nor the
  `recent_versions` / `related_items` / `authorized_users` includes; org-scoped
  nested create routes unused.
- **No tests, no CI, no accurate docs.**

## 3. Locked decisions

| Decision | Choice |
|---|---|
| Package name / version | `n8n-nodes-itglue-extended`, v2.0.0 (upgrade path for existing installs) |
| Repo | `github.com/Earney-IT/n8n-nodes-itglue-extended` (local git now; push later on request) |
| Coverage | Everything, including newer Kaseya endpoints |
| Unverified endpoints | Ship only after live-key verification (user pastes key at the verification step) |
| AI tooling | One node, `usableAsTool`, every operation AI-callable, `$fromAI()` defaults, LLM-grade descriptions |
| Passwords | Full power: reveal (`show_password`), versions/history, archive/restore, embedded/OTP, folders |
| Region | US (`api.itglue.com`) default; EU/AU selectable |
| Architecture | Registry-driven generic engine + targeted special handlers |

## 4. Architecture

Single n8n node `IT Glue` (`name: itGlue`, `usableAsTool: true`). Programmatic
node (has `execute`). Layout under `nodes/ITGlue/`:

```
nodes/ITGlue/
  ITGlue.node.ts          # node class: builds properties from registry, delegates to engine
  ITGlue.node.json        # corrected codex metadata
  itglue.svg
  transport/
    request.ts            # itGlueApiRequest, itGlueApiRequestAllItems
    errors.ts             # API error -> NodeApiError mapping
    rateLimit.ts          # 429 backoff + retry
  registry/
    types.ts              # ResourceDescriptor, FieldDescriptor types
    index.ts              # registry: ResourceDescriptor[]
    resources/*.ts        # one descriptor file per resource
  engine/
    properties.ts         # registry -> INodeProperties[] (resource/op/fields/filters/includes)
    crud.ts               # generic list/get/create/update/delete/bulk execute
    jsonapi.ts            # camelCase<->kebab JSON:API (de)serialisation
    pagination.ts         # JSON:API paging helpers
  resources/special/
    passwords.ts          # show_password, versions, archive/restore, embedded/OTP
    flexibleAssets.ts     # dynamic trait fields from flexible asset type
    attachments.ts        # any parent type, base64/binary upload, bulk destroy
    relatedItems.ts
    exports.ts            # create + poll + download
    documents.ts          # documents/sections/images/publish
  methods/
    loadOptions.ts        # single consolidated loadOptions (orgs, types, statuses, FA types, ...)
credentials/
  ITGlueApi.credentials.ts
```

### 4.1 Credentials

`ITGlueApi`: `region` (US `api` / EU `api.eu` / AU `api.au`), `apiKey`
(password field). Auth header `x-api-key`; default
`Content-Type: application/vnd.api+json`. Credential test:
`GET /organizations?page[size]=1`. Old incorrect type declarations removed.

### 4.2 Transport

`itGlueApiRequest(method, resource, body?, qs?)` and
`itGlueApiRequestAllItems(...)`:

- Base URL `https://<region>.itglue.com`, single-slash join (no `//`).
- JSON:API pagination `page[number]` / `page[size]` (cap 1000/page), safety
  page cap with a clear error suggesting filters.
- 429 handling: respect `Retry-After`, exponential backoff, bounded retries
  (rate limit = 3000 req / 5 min).
- Errors → `NodeApiError` carrying IT Glue `errors[].detail` and HTTP status;
  401/403/429 get actionable messages.
- `User-Agent` derived from package name + version (no hardcoded stale value).

### 4.3 Registry-driven engine

Each `ResourceDescriptor` declares: display name, JSON:API `type`, endpoint(s)
including org-scoped nested route (`/organizations/:id/relationships/<x>`),
supported operations, field schema (n8n property ⇄ kebab-case attribute,
required flags, types, loadOptions binding), available `include`s and `filter`s.

`engine/properties.ts` generates all `INodeProperties` (Resource dropdown,
per-resource Operation dropdown, fields, an `Additional Fields` collection,
`Filters` collection, `Include` multiselect, `Return All`/`Limit`) from the
registry. `engine/crud.ts` runs the generic operation: builds JSON:API body via
`jsonapi.ts`, applies filters/includes/sort/pagination, returns normalised
`INodeExecutionData` (id + type + flattened attributes + relationships).

Resources whose behaviour matches the generic pattern need only a descriptor.
Deviating resources register a descriptor **plus** a handler in
`resources/special/` that the engine dispatches to.

## 5. Resource & operation coverage

Generic CRUD = Get Many / Get / Create / Update / Delete (+ Bulk Update / Bulk
Delete where the API supports them), all `filter[...]`, `include`, `sort`,
pagination.

**Stable, ship unconditionally:** Organizations, Organization Types,
Organization Statuses, Configurations, Configuration Interfaces, Configuration
Statuses, Configuration Types, Contacts, Contact Types, Countries, Documents,
Document Sections, Document Images, Domains, Expirations, Exports, Flexible
Assets, Flexible Asset Fields, Flexible Asset Types, Groups, Locations, Logs,
Manufacturers, Models, Operating Systems, Passwords, Password Categories,
Platforms, Regions, Related Items, Users, User Metrics, Attachments.

**Verification-gated (build, then confirm against the live key before
shipping/marking stable):** Password Folders, SSL Certificates, Checklists,
Checklist Tasks, Checklist Templates, Tickets, Network Glue
(networks/devices), Copilot. Any endpoint that does not respond on the live
account is removed (not faked) before release.

Org-scoped nested create/list routes are offered (where the API requires or
benefits from them) via an optional "Scope to Organization" input.

## 6. Password subsystem (explicit requirement)

- **Create / Update** full attribute set: name, username, password, url, notes,
  `password_category_id`, `password_folder_id`, `resource`/related item linkage,
  `restricted`, OTP/embedded secret, autofill settings, organization scoping.
- **Reveal:** `show_password` parameter; **default true on Get (single)**,
  optional toggle on Get Many (default false to avoid bulk secret dumps unless
  asked). Surfaces IT Glue's note that API reveal can trigger the Password
  Access workflow notification — documented in README/field hints.
- **Versioning / history:** expose password versions via `include=recent_versions`
  and the version retrieval route; operation "Get Versions" + "Get Version".
- **Archive / Restore:** archive and unarchive operations.
- **Embedded passwords / OTP:** supported fields on create/update.
- **Password Folders:** full CRUD (verification-gated resource).

## 7. Flexible Assets dynamic fields

On create/update for Flexible Asset, a `flexibleAssetTypeId` (loadOptions)
selection drives a `resourceMapper`/dynamic-collection of trait fields fetched
from that type's Flexible Asset Fields (correct kind: text, textbox, date,
number, tag select → loadOptions of the tagged resource, etc.). Body built as
JSON:API `flexible-assets` with `traits`. Tag-type fields resolve to related
resource IDs via loadOptions.

## 8. Attachments

Generic across all supported parent types (configurations, contacts, documents,
domains, locations, passwords, flexible_assets, ssl_certificates, checklists,
checklist_templates, tickets — gated ones included only if verified). Operations:
list, get, create (base64 or n8n binary input → base64), update (name),
bulk delete. Parent selected by `resourceType` + `resourceId`.

## 9. AI-agent tooling

- `usableAsTool: true`; node + every operation written to be agent-driven.
- Every operation has an LLM-grade `action` and `description`; resource and
  operation option names verbose and unambiguous.
- Key parameters carry `$fromAI()`-style expression defaults so a Tools-Agent
  can populate them; safe fixed defaults where AI input is undesirable
  (e.g. bulk secret reveal stays off).
- Mitigation for n8n issue #26202 (community `usableAsTool` wrappers returning
  an empty observation): `execute` always returns populated
  `INodeExecutionData` including a concise human/LLM-readable result summary
  field; never returns an empty array silently (empty result → explicit
  `{ found: 0 }` style payload).
- README ships an "Using this node with AI Agents" guide with example prompts.

## 10. Error handling

- All API failures → `NodeApiError` with status + IT Glue `detail`.
- `continueOnFail()` respected per input item (error attached to item, indexed).
- Validation errors (missing required IDs/fields) → `NodeOperationError` with
  the exact missing field names before any HTTP call.
- 429 auto-retried with backoff; exhausted retries → actionable error.

## 11. Testing

Jest + mocked HTTP (no live calls in unit tests):

- `jsonapi.ts`: camelCase ⇄ kebab JSON:API body/round-trip.
- `engine/properties.ts`: registry → expected `INodeProperties` (resource list,
  per-op fields, includes/filters) snapshot.
- `pagination.ts`: multi-page aggregation, page cap, partial last page.
- `transport`: 401/403/429 mapping, 429 backoff/retry, URL join (no `//`).
- Passwords: `show_password` default logic (single vs many), version ops.
- Attachments: binary → base64 body shape.

Lint: `eslint-plugin-n8n-nodes-base`. Build: `tsc` + gulp icon copy.
`prepublishOnly` runs build + strict lint. GitHub Actions CI (lint + build +
test) committed (activates once pushed to Earney-IT).

A separate, opt-in live-verification script (run manually with the pasted key,
never committed, key never echoed/logged) probes the gated endpoints and prints
which exist; results decide what ships.

## 12. Documentation

- Auto-generated per-resource pages in `docs/` from the registry (always
  matches code) + a generated operation matrix.
- README: install, credentials/region setup, full resource/operation table,
  password security note, AI-agent usage guide, regional endpoints.
- `CHANGELOG.md` documenting the v1→v2 rewrite and any breaking changes.

## 13. Out of scope (YAGNI)

OAuth (IT Glue is API-key only); webhook/trigger node (IT Glue has no
webhooks); response caching layer; non-IT-Glue integrations.

## 14. Verification gate (open item, resolved at implementation)

User pastes a US-region IT Glue API key when implementation reaches the
verification step. Until then, gated resources are implemented but not enabled
in the published resource list. The key is used only by the manual verification
script and live smoke tests, never committed, logged, or echoed.

## 15. Implementation phases (detail produced by writing-plans)

1. Scaffold package (package.json v2.0.0, tsconfig, eslint, gulp, CI, .gitignore).
2. Credentials + transport + error/rate-limit + jsonapi + pagination (+ tests).
3. Registry types + engine (properties + generic CRUD) (+ tests).
4. Stable resource descriptors (all unconditional resources).
5. Special handlers: passwords, flexible assets, attachments, related items,
   exports, documents (+ tests).
6. AI tooling polish ($fromAI defaults, descriptions, summary payloads).
7. Live verification of gated endpoints; enable confirmed ones.
8. Docs generation, README, CHANGELOG; final lint/build/test; verification.
