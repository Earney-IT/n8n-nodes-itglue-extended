# Changelog

All notable changes to `n8n-nodes-itglue-extended` are documented here.

---

## 2.1.1 — 2026-05-31

### Fixed

- Removed the unused `main: "index.js"` entry (and the empty `index.js` file) from the package. n8n's community-package loader was calling `require(packageName)` on it, getting an empty exports object, and failing with "the specified package could not be loaded" before the explicit `n8n.nodes` paths were ever consulted.

---

## 2.1.0 — 2026-05-31

### Changed

- **Internal node name renamed** from `itGlue` to `itGlueExtended` and **display name** changed to **"IT Glue Extended"**. This avoids a case-insensitive collision with the unrelated third-party `n8n-nodes-itglue` package (which uses `iTGlue`) — n8n enforces a unique constraint on installed-node names that treats `itGlue` and `iTGlue` as identical, so the two packages could not coexist before.
- The full node type identifier becomes `n8n-nodes-itglue-extended.itGlueExtended`. Workflows still referencing the previous `n8n-nodes-itglue-extended.itGlue` type need their node `type` field updated.

---

## 2.0.1 — 2026-05-20

### Changed

- LLM tool description (`description.description`) rewritten to be action-oriented and explicit about capabilities. Helps AI agents pick this tool when relevant — "search and manage IT Glue documentation … password rotation, config inventory" instead of the generic "consume the IT Glue API". Same wording mirrored on npm.

No functional or security changes — `usableAsTool` remains true; reveal gate, backstop, redaction, and 223 tests unchanged.

---

## 2.0.0 — 2026-05-19

### Overview

Complete ground-up rewrite of the IT Glue n8n community node. The v2 architecture replaces the hand-crafted 1.x node with a **registry-driven engine** that auto-generates node UI, operations, and parameters from declarative resource descriptors. Every resource is uniformly typed and tested.

### New features

- **35 enabled resources** with full CRUD support where the IT Glue API allows it:
  `Organization`, `Organization Type`, `Organization Status`, `Location`,
  `Configuration`, `Configuration Interface`, `Configuration Status`, `Configuration Type`,
  `Contact`, `Contact Type`,
  `Country`, `Domain`, `Expiration`, `Group`, `Log`, `Manufacturer`, `Model`, `Operating System`, `Platform`, `Region`,
  `User`, `User Metric`,
  `Flexible Asset`, `Flexible Asset Field`, `Flexible Asset Type`,
  `Password`, `Password Category`,
  `Attachment`, `Related Item`, `Export`, `Document`,
  `SSL Certificate`, `Checklist`, `Checklist Template`, `Ticket` _(live-verified 2026-05-19: HTTP 200)_.

- **6 special-case handlers** for resources requiring custom request pipelines:
  - `passwords` — fail-closed reveal gate + archive/restore/versions
  - `flexibleAssets` — traits JSON + type-scoped listing
  - `attachments` — multipart upload + binary data handling
  - `relatedItems` — polymorphic relationship management
  - `exports` — async export creation with polling (`createAndWait`)
  - `documents` — publish workflow support

- **Secret-safe fail-closed password handling for AI use:**
  - Plaintext never returned when the node runs as an AI/agent tool (`ctx.isToolExecution() === true`).
  - `revealPlaintext` toggle is a design-time author control; agents cannot set it.
  - All password responses redacted by default (`password: "[REDACTED]"`).
  - Agents can create, update, rotate, and delete passwords — but never read plaintext back.

- **JSON:API transport layer:**
  - Automatic 429 backoff with `Retry-After` header support.
  - Cursor-based pagination with configurable `returnAll` / `limit` parameters.
  - Full JSON:API request/response serialisation and deserialisation.

- **`usableAsTool: true`** — the node works as a first-class AI agent tool in n8n's AI Agent node.

- **219 unit and integration tests** (Jest + ts-jest) covering all handlers, the transport layer, the registry, and the properties generator.

- **CI via GitHub Actions** — lint, test, and build on every push and pull request (Node 20).

- **Docs generator** (`npm run docs`) — produces per-resource Markdown docs and a full resource matrix from the registry.

- **Live-API endpoint verification (2026-05-19):** `SSL Certificate`, `Checklist`, `Checklist Template`, and `Ticket` were probed and confirmed (HTTP 200) — now enabled. `Checklist Task` returned HTTP 401 on the top-level collection endpoint (likely only valid nested under a checklist) — remains gated pending nested-route support. `Password Folder`, `Network Glue`, and `Copilot` returned HTTP 404 on this account — removed from the registry. Password `passwordFolderId` field changed from a loadOptions dropdown to a plain string field (the `/password_folders` collection endpoint does not exist, but the `password-folder-id` attribute on passwords is still valid).

### Breaking changes from v1.x

- **Resource and operation names have changed.** v1.x used a flat parameter structure; v2 uses a registry-driven approach with typed `resource` + `operation` selectors. Existing workflows using the v1 node will need to be recreated.
- **Credential structure is unchanged** — the `itglueApi` credential (region + API key) is compatible with v1.

### Dependency changes

- Now requires Node ≥ 20.15 and n8n-workflow ≥ 2.16.0.
- Development dependencies: TypeScript 5.8, Jest 29, ts-jest 29, ts-node 10, ESLint 8.

---

## 1.1.0 (prior release — pre-rewrite)

The 1.x series was a hand-maintained IT Glue node with partial resource coverage and no test suite. See git history for details.
