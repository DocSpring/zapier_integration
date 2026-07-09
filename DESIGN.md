# DocSpring Zapier Integration — Design Notes

Architecture and rationale for the CLI integration. Companion to `README.md`.

## Background

Migrated from the Zapier Visual Builder (app 71146, unpublished/WIP). The
original triggers targeted an old `POST /api/v1/webhook_subscriptions` API that
no longer exists; this branch's webhook overhaul replaced it with a REST-hook
system at `/api/v1/webhooks`. Because the app was never published, there are no
live Zaps to migrate, so keys and shapes were chosen freely.

## Authentication & regions

- Custom auth (`type: 'custom'`) with fields: `region`, `custom_host`,
  `token_id`, `token_secret`. Custom (not Basic) so we can present a region
  dropdown + self-hosted host.
- `lib/regions.js` maps each region to a standard host and a sync host:
  - US `api.docspring.com` / `sync.api.docspring.com`
  - EU `api-eu.docspring.com` / `sync.api-eu.docspring.com`
  - AU `api-au.docspring.com` / `sync.api-au.docspring.com`
  - Self-hosted → the user's `custom_host` (single origin, no separate sync host)
- `lib/middleware.js` `beforeRequest` prepends the standard base URL to
  root-relative request paths and attaches `Authorization: Basic
base64(token_id:token_secret)`. Absolute URLs (the sync host, used by the
  create actions) pass through unprefixed. `afterResponse` turns non-2xx
  responses into readable errors (`flags.skipThrowForStatus` delegates this to
  us). Connection label is derived from the token prefix (no API call).

## Triggers (REST hooks)

`lib/hooks.js` `makeHookTrigger({ key, noun, label, description, eventType,
resource, performList, inputFields })` builds a complete hook trigger:

- **performSubscribe** → `POST /api/v1/webhooks` with `{ webhook: { url:
targetUrl, event_types: [eventType], include_submission_data: true, version: 3,
mode, template_uids, folder_uids } }`. `version: 3` is pinned so the delivery
  shape matches `flattenDelivery` even if the server default changes.
- **performUnsubscribe** → `DELETE /api/v1/webhooks/{uid}`; tolerates a 404 so
  turning a Zap off always succeeds even if the webhook was already deleted.
- **inputFields**: submission/data-request triggers offer template/folder/mode
  filters; template triggers omit mode (mode-agnostic events); combined and
  batch triggers use `scopeFields.modeOnly` — those events are not
  template/folder scopable on the server, and the webhook API rejects the
  combination with a validation error.
- **perform** → `flattenDelivery(bundle.cleanedRequest)`.
- **performList** → recent items from the matching list endpoint, reshaped
  through the same envelope. Data-request and batch resources have no list
  endpoint, so they use a sample-backed `performList` (see
  `lib/performLists.js`); a future Rails `GET /data_requests` collection would
  let those become real lists.

### Payload flattening & dedup (correctness-critical)

`lib/payload.js` `flattenDelivery` turns the v3 delivery body
(`{ id, event, timestamp, data: { resource, ...fields } }`) into a flat object.
**The top-level `id` stays the event id** (a uuid, stable across retries); the
resource's own id is exposed as `resource_id`. If the resource id were allowed
to overwrite `id`, Zapier's dedup would silently drop later events for a resource
that emits more than one (e.g. a submission's `created` then `processed`). This
is guarded by `test/lib/payload.test.js`.

Per-resource output fields + samples live in `lib/resources/*` (one module per
resource, co-located so they can't drift). Freeform objects (`metadata`, `data`)
are intentionally omitted from declared `outputFields` (Zapier has no object
type → would trip check D024) but remain in the sample so they still map.

## Generate PDF (flagship)

`creates/generate_pdf.js` + `lib/templates.js`:

- inputFields = static [`templateDropdown`, ...`controlFields`] + a dynamic
  function `templateSchemaFields`. The dropdown (`dynamic:
'list_templates.id.name'`, `altersDynamicFields: true`) drives a fetch of
  `GET /templates/{id}/schema`; `jsonSchemaToZapierFields` converts that JSON
  Schema into typed inputs.
- Template-field inputs are namespaced **`data__<field>`** so a field named
  `test`/`metadata`/`version`/etc. can't collide with a control input. `perform`
  strips the prefix to rebuild the `data` object.
- Posts to the **sync host** with `?wait=true` so the finished PDF returns within
  Zapier's perform timeout.

## Creates / searches

- `combine_pdfs` — line-item `source_pdfs` → `POST /combined_submissions` on the
  sync host, which waits for processing (same mechanism as Generate PDF), so it
  returns the finished combined PDF. There is no `test` input — the API derives
  test/live from the token.
- `find_submission` treats a 404 on ID lookup as "not found" and returns `[]`
  (Zapier search semantics; enables find-or-create). Unsubscribe likewise
  tolerates an already-deleted webhook (404).
- `find_template`, `find_submission` — search actions returning arrays;
  `find_template` also backs the template dropdown's `search`.

## Conventions / gotchas

- Field key/label must not contain "password" (Zapier check D001 treats it as a
  credential); the PDF-encryption field is keyed `pdf_passphrase` and mapped to
  the API's `password` param in perform.
- npm + committed `package-lock.json` (Zapier build needs it); not a pnpm
  workspace member. Tests are isolated by a local `jest.config.js`.

## Deferred (future passes)

- Triggers for folder / api_token / webhook / user / account_integration /
  custom_file events.
- Creates: Batch Generate, Create Folder, Create HTML Template, Add Fields to
  Template, Expire Submission, Create Data Request Token.
- Searches: Get Combined Submission, Get Submission Batch, Get Data Request.
- Real `performList` for data-request/batch triggers once a list endpoint exists.
- Recursive expansion of nested object/array-of-object template fields (currently
  a single dict input).
- CI job (lint + validate + jest) wired via `.circleci/src/`.
