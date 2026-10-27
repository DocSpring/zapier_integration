# DocSpring Zapier Integration (Platform CLI)

The DocSpring integration for Zapier, built with the
[Zapier Platform CLI](https://docs.zapier.com/platform/reference/cli-docs). It is
linked to Zapier app **71146** (`.zapierapprc`).

Version 2.0.0 uses [DocSpring API v2](https://docspring.com/docs/api-guide/migrating-to-api-v2/)
and version 4 webhooks. Version 1.1.0 (API v1) stays on Zapier as its own version for the
Zaps built on it. See [`DESIGN.md`](./DESIGN.md) for the architecture and
[`CHANGELOG.md`](./CHANGELOG.md) for what changed.

## Requirements

- Node.js >= 22
- The Platform CLI: `npm install -g zapier-platform-cli` (invoked as
  `zapier-platform` in v19+). Log in once with `zapier-platform login`.

> ⚠️ This project uses **npm** (not pnpm), and Zapier's build/push needs the
> committed `package-lock.json`.

## Develop

```bash
npm install                                  # zapier-platform-core, jest, nock
npx jest                                     # unit tests: HTTP is mocked, the network is blocked
npx zapier-platform validate --without-style # schema and integration checks, locally
```

`npm run validate` (without `--without-style`) also sends the app to Zapier's servers
for their style checks.

## Auth

Custom auth collecting a **Region** (US / EU / Self-hosted), an **API Token
ID**, and an **API Token Secret**. The Basic `Authorization` header, the
`docspring-zapier/<version>` User-Agent and the region host are added by
`lib/middleware.js`, only to requests for the DocSpring API. The connection test is
`GET /api/v2/authentication`. A self-hosted install needs a DocSpring release with API v2.

## What's inside

- **Triggers** (REST hooks, one version 4 webhook each): every webhook event except
  `webhook.*`: submission created / processed / failed / declined / updated / expired,
  signature request viewed / completed / declined / updated, combined PDF processed /
  failed / expired, submission batch processed / failed, template created / updated /
  deleted, custom file created, folder created / updated / deleted. Each delivery's
  `X-DocSpring-Signature` is verified with the webhook's secret. Plus the hidden
  `template_choices` and `folder_choices` triggers behind the dropdowns.
- **Creates**: Generate PDF, Generate PDFs in a Batch, Check Data, Generate Submission
  Files, Expire Submission, Combine PDFs, Create Signature Request, Create Signing Link,
  Create Template, Replace Template PDF, Copy Template, Move Template, Publish Template
  Version, Add / Update / Remove Template Fields, Create Folder.
- **Searches**: Get Submission, Find Submissions, Get Submission Batch, Get Combined PDF,
  Get Signature Request, Find Templates, Get Template, List Template Fields, Get Template
  Page Images, List Folders. **Find or Create Folder** pairs List Folders with Create
  Folder.

## Deploy

```bash
npx zapier-platform validate --without-style
zapier-platform push          # uploads the version in package.json to app 71146
```

The integration is private (invite-only), so a new version is shared rather than
promoted: share it from the Zapier developer platform (by email invite or the version's
invite link). `zapier-platform promote` on a private integration starts Zapier's
request to make it public.

## Tests

Unit tests use `zapier-platform-core`'s `appTester` with `nock` to mock HTTP; the
network is blocked (`test/setup.js`), so they need no credentials and make no live
calls. Waiting is tested with a fake clock (`fakeClock` in `test/helpers.js`), and
dropdown paging with an in-memory cursor (`runWithCursor`).
