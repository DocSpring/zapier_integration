# DocSpring Zapier Integration — Design Notes

Architecture and rationale for the CLI integration. Companion to `README.md`.

## Versions

- **2.0.0** (this code) is on DocSpring API v2 (`/api/v2`) and version 4 webhooks. It has
  only the new keys (`generate_pdf`, `create_signature_request`, `combine_pdfs`,
  `signature_request_completed`, `combined_pdf_processed`, …) and returns API v2's
  resources as they are.
- **1.1.0** stays on Zapier as it is (API v1, version 3 webhooks) for the Zaps built on
  it. A major version can't be migrated to (`zapier-platform migrate` refuses to cross a
  major), and Zapier's hidden-key pattern only helps within one major, so 2.0.0 carries
  none of 1.1.0's keys or output shapes. Owners of 1.1.0 Zaps move them over in the
  Zap editor. Webhooks that 1.1.0 created keep version 3; 2.0.0 deletes webhooks by ID,
  which works for them too.
- A self-hosted (Enterprise) install needs a DocSpring release with API v2. Without it,
  every `/api/v2` path is a 404 that isn't an API v2 error, and the integration says:
  "This DocSpring server doesn't have API v2 yet. Upgrade it to the latest release, or
  use version 1.1.0 of this integration."

## Authentication & regions

- Custom auth (`type: 'custom'`) with fields `region`, `custom_host`, `token_id`,
  `token_secret`, so we can offer a region dropdown and a self-hosted host. The
  connection test is `GET /api/v2/authentication`.
- `lib/regions.js` maps each region to a standard host and a sync host:
  US `api.docspring.com` / `sync.api.docspring.com`, EU `api-eu.docspring.com` /
  `sync.api-eu.docspring.com`, self-hosted → the user's `custom_host` for both.
- `lib/middleware.js` `beforeRequest` prepends the standard host to root-relative paths
  and, **only for requests to this connection's DocSpring hosts**, adds
  `Authorization: Basic base64(token_id:token_secret)`, `User-Agent:
docspring-zapier/<version>` (so `api_logs.user_agent` counts users by version),
  `Accept` and `Content-Type: application/json`. Requests anywhere else (downloading a
  file a user mapped into Create Template) never carry the credentials.
- `afterResponse` turns DocSpring error responses into readable errors (below). There
  is **no** app-wide `flags.skipThrowForStatus`: with it, the platform marks every
  request `skipThrowForStatus`, so this middleware skipped them all and API errors came
  back as successful output (true in 1.1.0). Requests that expect an error status (a
  search's 404, unsubscribe's 404) set `skipThrowForStatus` on themselves.

## Requests (`lib/util.js`, `lib/api.js`)

- Bodies are flat JSON. `version` and `wait` are query parameters. Blank inputs are
  left out (API v2 rejects `""` and `null` for most optional properties); `compact`
  drops `undefined`, and the input helpers turn blanks into `undefined`.
- `test` is sent only when it's true (API v2 rejects `test: false` from a test token).
- Booleans and integers are converted from the text Zapier may hand over
  (`toBoolean`, `toInteger`); a value that can't convert is an error before any request.
- Bodies are sent already serialized (`apiRequest`): the platform's own JSON encoding
  deletes every `{{...}}` from top-level string values as unfilled template tags, which
  would strip the Liquid tags from an HTML template's `html`.
- IDs from inputs are URL-encoded into paths (`seg`). A blank ID, `.` or `..` is an
  error before any request: encoding can't stop a URL from reading `..` as "the folder
  above".
- Lists use `limit` and `cursor` and return `{data, next_cursor}`.

## Errors (`lib/errors.js`, `lib/records.js`)

- An HTTP error reads `DocSpring API error <status> <code>: <message>`, then a line per
  detail (`<pointer or parameter>: <message>`), then `Submission: <id>` (or the batch,
  combined PDF or template ID) when the error names one, then `Request ID: <id>`.
- A record that ends in a failure state (a 201 with `state: error`,
  `image_download_failed`, …; a template whose `document.state` is an error) is an error
  naming the state, its `error_message` and the record's ID.
- A 429 is left to the platform, which retries the step after `Retry-After`, except
  where a retry would make something twice: while waiting for a record (below) and on
  Create Signature Request's signing links. Those requests set
  `throwForThrottlingEarly: false` (the platform's throttling check runs before our
  `afterResponse`), wait for `Retry-After` when it fits the time left, and otherwise
  end with an error naming what was made.

## Waiting for files (`lib/wait.js`, `lib/records.js`)

Zapier stops an action's `perform` after 30 seconds, but the sync API host waits up to
95 seconds, and when Zapier cuts a request off the integration never learns the ID of
the record it created (and a replayed step creates a duplicate). So the operations that
make a file (Generate PDF, Generate PDFs in a Batch, Combine PDFs, Create Template,
Replace Template PDF, Generate Submission Files) send their request to the sync host
with `wait=false`, which returns the record's ID at once, and then poll the record
(`GET`) for up to 25 seconds from the start of the perform (its first line, so
downloading a PDF File counts; if the download alone takes more than 25 seconds,
nothing is created). It waits 1, 2, 4, 8, 8, … seconds between checks (checks at
about 1, 3, 7, 15 and 23 seconds), and cuts the last wait short to check once more at
25 seconds. If it still isn't ready, the error names it: "The PDF wasn't ready in time.
Get it later with Get Submission (<id>), or use the submission.processed trigger." A
rate-limited check (429) waits for its `Retry-After` when that fits the time left. A
failed check (a 429 that doesn't fit, a 5xx, a network error) ends the wait with the
same kind of message, never a retry.

Trade-off: each check counts against the account's API rate limit (a sync request
counts once), so a PDF that takes a few seconds costs two or three requests instead of
one. Each of these operations has a "Wait for …?" input; No returns the pending record
straight away (use a trigger to hear when it's ready).

A submission is ready when its `state` isn't `pending` and none of its `files` is
`pending` (page images can follow the PDF); a batch when it isn't `pending` and, if
it's in `error`, has `processed_at` (one failed PDF puts it in `error` while the rest
are still running); a template when its `document.state` isn't `pending` or
`downloading`.

## Triggers (REST hooks)

`triggers/webhook_events.js` builds one trigger per API v2 webhook event, except
`webhook.*` (22), with `lib/hooks.js` `makeHookTrigger`:

- **performSubscribe** → `POST /api/v2/webhooks` with a flat body: `url`,
  `event_types: [<event>]`, `name`, `include_submission_data: true`, and `mode`,
  `template_ids`, `folder_ids` when set. No `version`: webhooks created with API v2 are
  version 4. It returns only `{id}`, so the webhook's signing secret isn't stored at
  Zapier.
- **performUnsubscribe** → `DELETE /api/v2/webhooks/{id}`; a 404 counts as done.
- **inputFields**: only the filters API v2 accepts for the event (it rejects a scope list
  that can't apply): submission and signature request events take templates, folders and
  mode; template events templates and folders; folder events folders; combined PDF,
  batch and custom file events mode. Only submission, signature request and template
  events can be filtered by template (the Templates help says so), and subscribe fails
  before any request if templates are set for another event.
- **perform** → the version 4 event as delivered, plus `resource_type` (the event name
  before the first dot) and `resource_id` (`data.id`).
- **performList** → recent records from the matching list (`/submissions`,
  `/combined_pdfs`, `/templates`, `/custom_files`, `/folders`), shaped like deliveries.
  Signature requests and batches have no list endpoint, so they show the trigger's
  sample.

### Dedup (correctness-critical)

Zapier deduplicates REST-hook results by the top-level `id`. That must stay the
**event** ID (stable across retries): one resource emits several events (a submission's
`created`, then `processed`), and with the resource's ID as `id` Zapier would drop every
event after the first. The resource stays nested under `data`, so neither its `id` nor
its `created_at` can overwrite the event's. Guarded by `test/lib/payload.test.js`.

## Outputs (`lib/resources/*`)

Creates and searches return the API v2 resource as the API returns it; triggers return
it under `data`. Zapier flattens nested objects with `__`, so the declared output fields
label the nested keys users map: `files__pdf__download_url`, `files__pdf__permanent_url`,
`files__pdf__sha256`, `document__download_url`, `signature_requests[]signing_url`, … (and
`data__…` in triggers). Freeform objects (`data`, `metadata`) are in the samples but not
declared (Zapier has no object output type; check D024).

## Template fields (`lib/templates.js`)

Generate PDF, Check Data and Create Signature Request build inputs from
`GET /templates/{id}/schema?version=` (the version chosen in the action, so the fields
match; `version` has `altersDynamicFields`). Keys are namespaced so a template field
named `test` or `metadata` can't collide with a control input, and the prefix says how
`perform` sends the value:

- `data__<name>`: as the user mapped it (API v2 checks it against the template).
  Dates are text inputs whose help says `YYYY-MM-DD` (a Zapier date input would send a
  date and time); date-time fields are date inputs. Lists of scalars are list inputs,
  objects of scalars are dict inputs.
- `data_json__<name>`: JSON text, for nested objects and lists of objects.
- `data_image__<name>`: image, signature and initials fields: a URL, sent as
  `{"url": ...}`, or JSON such as `{"base64": ...}`.

Check Data and Create Signature Request make every field optional; Create Signature
Request leaves out signature and initials fields (only signers fill them in).

## Signature requests

Create Signature Request posts to the standard host (the submission returns straight
away, waiting for its signers) with `signature_requests`. Each signer is a group of
inputs (`signer_<n>_…`, up to 10, set by "Number of Signers"): name, email, fields (a
multi-select of the template's field names from `GET /templates/{id}/fields?version=`,
with the chosen version or `latest` when it's blank, as the submission uses (the field
list's own default is the draft); each name once, without static, `combined` and `@@`
fields; required by API v2), role, auth type (`email_link` by default; OAuth needs a provider),
prefilled values editable, ignore unknown fields. Line items can't hold a multi-select,
hence the groups. After creating, it makes a token per signature request
(`email`: 7 days, by default; `api`: 24 hours; or none) and adds `signing_url` to each,
plus `first_signature_request_id` and `first_signing_url`. The tokens share the step's
25-second budget (from the start of the perform): a rate-limited token request waits for
`Retry-After` when that fits the time left. If a token still fails (or there's no time
left to make the next one), the error says the requests exist, names the submission and
every signature request still without a link, and says to use Create Signing Link rather
than run the step again.

## Dropdowns

`template_choices` and `folder_choices` are hidden polling triggers with `canPaginate`.
Zapier asks for page 0, 1, 2, …; API v2 pages by cursor, so each page's `next_cursor` is
kept with `z.cursor` (an empty cursor means the last page). They stop at 1,000 items.
Remove Template Fields and the signer field multi-selects get their choices from the
template's field list (one request, not paged).

## Conventions / gotchas

- Field key/label must not contain "password" (Zapier check D001 treats it as a
  credential); the PDF password input is `pdf_passphrase`, sent as `password`.
- Input field keys must be unique within an action, line-item children included.
- npm + committed `package-lock.json` (Zapier build needs it).
- `flags.cleanInputData` is `false` (check D028): blank inputs reach `perform`, and the
  helpers in `lib/util.js` handle them.
- The self-hosted `custom_host` is validated by `normalizeHost` (check D026): only
  `[http(s)://]host[:port]`.
- Every auth field's `helpText` links to where the value is found (check D002).
- The app description on Zapier's Integration Settings page must start with
  "DocSpring is a" (check M002). It is edited in the developer UI, not pushed from
  `package.json`.
- Code is formatted with Prettier (`semi: false`, `singleQuote: true`,
  `trailingComma: es5`, the monorepo's settings).

## Not built

- **Make an API Call.** Zapier's built-in "API Request" action can use an
  integration's auth, but it isn't available for private integrations, and Zapier
  stopped enabling it (and Custom Actions) for new integrations on 1 July 2024: it's
  turned on by Zapier Platform Support on request, not by a setting in the developer UI
  or code here.
- Custom file uploads (Combine PDFs takes URLs), signature request update/events,
  template diff/restore/model code, folder rename/move/delete, webhook management as
  actions.
