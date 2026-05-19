# n8n-nodes-itglue-extended

> n8n community node — comprehensive IT Glue API integration with full CRUD, secret-safe password handling, and AI-agent support.

[![npm version](https://img.shields.io/npm/v/n8n-nodes-itglue-extended)](https://www.npmjs.com/package/n8n-nodes-itglue-extended)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![n8n community node](https://img.shields.io/badge/n8n-community--node-orange)](https://docs.n8n.io/integrations/community-nodes/)

---

## Contents

- [Install](#install)
- [Credentials & Region setup](#credentials--region-setup)
- [Resources & Operations](#resources--operations)
- [Password security](#password-security)
- [Using with AI Agents](#using-with-ai-agents)
- [Regional endpoints](#regional-endpoints)
- [Contributing / build](#contributing--build)
- [License](#license)

---

## Install

### Via n8n community node manager (recommended)

1. In n8n, open **Settings → Community Nodes**.
2. Click **Install a Community Node**.
3. Enter `n8n-nodes-itglue-extended` and click **Install**.
4. Restart n8n when prompted.

### Via npm (self-hosted)

```bash
npm i n8n-nodes-itglue-extended
```

Then restart n8n.

---

## Credentials & Region setup

This node uses the **IT Glue API** credential type (`itglueApi`).

| Field | Description |
|---|---|
| **Region** | Your IT Glue data region: **US**, **EU**, or **AU** |
| **API Key** | Your IT Glue API key |

**How to get your API key:**

1. Log in to IT Glue.
2. Go to **Account → Settings → API Keys**.
3. Create a new key (or copy an existing one).
4. Paste the key into the n8n credential.

The node automatically uses the correct base URL for your region:

| Region | Base URL |
|---|---|
| US | `https://api.itglue.com` |
| EU | `https://api.eu.itglue.com` |
| AU | `https://api.au.itglue.com` |

---

## Resources & Operations

See the full **[Resource Matrix](docs/resources/README-matrix.md)** for a complete table.

### Enabled resources — 35 resources

The following resources are fully operational in v2.0.0:

| Category | Resources |
|---|---|
| **Core** | Organization, Organization Type, Organization Status, Location |
| **Configurations** | Configuration, Configuration Interface, Configuration Status, Configuration Type |
| **Contacts** | Contact, Contact Type |
| **Reference** | Country, Domain, Expiration, Group, Log, Manufacturer, Model, Operating System, Platform, Region |
| **Users** | User, User Metric |
| **Assets** | Flexible Asset, Flexible Asset Field, Flexible Asset Type |
| **Passwords** | Password, Password Category |
| **Special** | Attachment, Related Item, Export, Document |
| **Live-verified** | SSL Certificate, Checklist, Checklist Template, Ticket |

Each resource supports full CRUD operations where the IT Glue API allows them (`getAll`, `get`, `create`, `update`, `delete`, `bulkUpdate`, `bulkDelete`). The Password resource also supports `archive`, `restore`, `getVersions`, and `getVersion`.

### Verification-pending resources — 1 resource

The following resource is implemented but **not yet enabled** in the node UI:

- **Checklist Task** — live probe returned HTTP 401 on `GET /checklist_tasks`; likely only valid as a nested sub-route under a checklist. Will be enabled when nested-route support is added.

See [docs/resources/README-matrix.md](docs/resources/README-matrix.md) for details.

---

## Password security

> **This section is important if you use this node in AI/agent workflows or expose it to automation.**

Password plaintext is **fail-closed by default**:

- **Plaintext is NEVER returned when the node runs as an AI/agent tool.** This is enforced at the code level — the `revealPlaintext` field is ignored entirely during tool execution, and responses are redacted.
- **Revealing plaintext requires** a **non-tool workflow execution** (a normal manual, trigger, webhook, or other author-controlled run — **never** an AI-agent/tool invocation), AND the workflow author has explicitly enabled the **Reveal Plaintext** toggle (which an AI agent cannot set).
- An AI agent **cannot set** the "Reveal Plaintext" toggle — it is a design-time author control, not a runtime parameter.
- All password responses are **redacted by default** (`password: "[REDACTED]"`).
- IT Glue's **Password Access** audit trail will log every API reveal. Monitor your IT Glue audit log for unexpected access events.

**What agents CAN do with passwords:**

- Create new password entries
- Update existing password entries (e.g. rotate a password value)
- Delete / archive password entries
- List passwords (metadata only — no plaintext)

**What agents CANNOT do:**

- Retrieve plaintext password values
- Override the reveal gate

This behaviour is intentional and cannot be bypassed at runtime.

---

## Using with AI Agents

This node is registered as `usableAsTool: true`, meaning it works seamlessly as a tool in n8n's AI agent nodes (e.g. the **AI Agent** node with OpenAI/Anthropic).

The agent automatically receives a description of every available resource and operation. Example agent prompts:

- `"Find the configuration named 'PROD-SWITCH-01' in org Acme Corp"`
- `"Create a password entry called 'New Firewall Admin' in org Acme Corp with username admin"`
- `"List all locations for organization ID 12345"`
- `"Update the contact John Smith's email to john@example.com"`
- `"Get all flexible assets of type 'Server' for Acme Corp"`

> **Note:** An agent CANNOT retrieve a plaintext password — this is by design. See [Password security](#password-security) above.

---

## Regional endpoints

| Region | API Base URL | n8n Credential |
|---|---|---|
| United States | `https://api.itglue.com` | Select **US** |
| Europe | `https://api.eu.itglue.com` | Select **EU** |
| Australia | `https://api.au.itglue.com` | Select **AU** |

---

## Contributing / build

```bash
# Clone and install
git clone https://github.com/Earney-IT/n8n-nodes-itglue-extended.git
cd n8n-nodes-itglue-extended
npm ci

# Run tests (219 tests)
npm test

# Lint
npm run lint

# Build
npm run build

# Regenerate resource docs
npm run docs
```

### Project structure

```
nodes/ITGlue/
  registry/          Registry-driven engine — descriptors, types, properties generator
    resources/       Stable resource descriptors
    resources/gated/ Verification-pending resource descriptors
  handlers/          Special-case handlers (passwords, flexible assets, attachments, etc.)
  transport/         HTTP transport, 429 backoff, pagination, JSON:API helpers
  ItGlue.node.ts     Main node class
credentials/
  ITGlueApi.credentials.ts
scripts/
  gen-docs.ts        Docs generator (npm run docs)
  verify-endpoints.ts Endpoint verification script (Task 19B, post-live-check)
docs/resources/      Generated per-resource docs + resource matrix
```

---

## License

MIT — see [LICENSE](LICENSE).

---

## Links

- **npm:** https://www.npmjs.com/package/n8n-nodes-itglue-extended
- **GitHub:** https://github.com/Earney-IT/n8n-nodes-itglue-extended
- **Issues:** https://github.com/Earney-IT/n8n-nodes-itglue-extended/issues
- **n8n community nodes docs:** https://docs.n8n.io/integrations/community-nodes/
- **IT Glue API docs:** https://api.itglue.com/developer
