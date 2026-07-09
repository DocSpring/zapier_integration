# DocSpring Zapier Integration (Platform CLI)

The DocSpring integration for Zapier, built with the
[Zapier Platform CLI](https://docs.zapier.com/platform/reference/cli-docs). It is
linked to Zapier app **71146** (`.zapierapprc`).

This was originally built in the Zapier Visual Builder and migrated to the CLI so
it can be developed as code. See [`DESIGN.md`](./DESIGN.md) for the architecture.

## Requirements

- Node.js >= 22
- The Platform CLI: `npm install -g zapier-platform-cli` (invoked as
  `zapier-platform` in v19+). Log in once with `zapier-platform login`.

> ⚠️ This project uses **npm** (not pnpm). It is intentionally _not_ a member of
> the monorepo's pnpm workspace, and Zapier's build/push needs a
> `package-lock.json`. Run npm commands from inside this directory.

## Develop

```bash
cd integrations/zapier
npm install          # installs zapier-platform-core, jest, nock
npm test             # jest + nock unit tests (no network)
npm run validate     # zapier-platform validate (schema + checks)
```

## Auth

Custom auth collecting a **Region** (US / EU / AU / Self-hosted), an **API Token
ID**, and an **API Token Secret**. The Basic `Authorization` header and the
region base URL are injected by `lib/middleware.js`; Test vs Live is inferred
from the token-id prefix (`api_test_` vs `api_`).

## What's inside

- **Triggers** (REST hooks): submission processed/failed/created/expired, data
  request completed/viewed, combined submission processed/failed, batch
  processed/failed, template created/updated/deleted. Combined/batch triggers
  offer only a Mode filter — those events are not template/folder scopable. Plus hidden `list_templates` /
  `list_folders` triggers powering the dynamic dropdowns.
- **Creates**: **Generate PDF** (template dropdown → dynamic, schema-driven
  fields) and **Combine PDFs** — both synchronous via the `sync.api.*` host.
- **Searches**: Find Template, Find Submission.

All logic lives in `lib/`; each trigger is a thin `makeHookTrigger({...})` call.

## Deploy

```bash
npm run validate
zapier-platform push          # uploads a new version to app 71146
zapier-platform promote 1.0.1 # when ready to make it live
```

> Pushing a CLI version makes that version **uneditable in the Visual Builder**.

## Tests

Unit tests use `zapier-platform-core`'s `appTester` with `nock` to mock HTTP, so
they need no credentials and make no live calls. The most important guard is
`test/lib/payload.test.js` (dedup correctness — the event id must never be
clobbered by a resource id).
