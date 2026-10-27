# Changelog

## 2.0.0

A new major version on [DocSpring API v2](https://docspring.com/docs/api-guide/migrating-to-api-v2/).
Version 1.1.0 stays available for the Zaps built on it; move a Zap to 2.0.0 in the Zap
editor and re-map its fields.

- **API v2.** Every request goes to `/api/v2`, and triggers create version 4 webhooks.
  Self-hosted (Enterprise) installs need a DocSpring release with API v2; until then,
  keep using 1.1.0.
- **New names.** Data requests are signature requests, combined submissions are combined
  PDFs, and keys use the new names: `create_signature_request`,
  `signature_request_completed`, `signature_request_viewed`, `combined_pdf_processed`,
  `combined_pdf_failed`, `find_templates`, `get_submission`, `find_submissions`, ….
- **Outputs are API v2's resources.** The PDF links are in `files`
  (`files__pdf__download_url`, `files__pdf__permanent_url`, `files__pdf__sha256`), a
  template's PDF in `document`; `data_errors` replaces `json_schema_errors`;
  `has_password` replaces `password`. Triggers output the version 4 event
  (`id`, `event_type`, `created_at`, `data`) plus `resource_type` and `resource_id`.
- **New actions:** Generate PDFs in a Batch, Check Data, Generate Submission Files (page
  images), Expire Submission, Create Signing Link, Create Template (from a PDF URL or
  file, with AI field detection, or HTML), Replace Template PDF, Copy Template, Move
  Template, Publish Template Version, Add / Update / Remove Template Fields, Create
  Folder.
- **Searches:** Find Submission is now Get Submission and Find Template is now Find
  Templates. New: Find Submissions, Get Submission Batch, Get Combined PDF, Get
  Signature Request, Get Template, List Template Fields, Get Template Page Images, List
  Folders, and Find or Create Folder.
- **New triggers:** Submission Declined, Submission Updated, Signature Request Declined,
  Signature Request Updated, Combined PDF Expired, Custom File Created, Folder Created,
  Folder Updated, Folder Deleted.
- **Generate PDF** takes a template version, PNG page images, field overrides and
  whether to wait; date fields take `YYYY-MM-DD`; image and signature fields take a URL.
  Generate PDF, Check Data and Create Signature Request also take **Data (JSON)**, so a
  template ID mapped from an earlier step can still get its data (the template's own
  fields win over the same names in the JSON).
- **Create Signature Request** takes each signer's fields from the template's field list
  (required by API v2), their role and how they were authenticated, and returns a
  signing link for each signer: an email link lasts 7 days, a link to open now 24 hours.
- **Waiting.** Actions that make a file wait up to 25 seconds (Zapier stops actions after 30) and, if it isn't ready, say how to get it later instead of failing silently.
- **Errors** show API v2's error code, message, each problem and the request ID. A PDF
  that fails is an error with its state and message (1.1.0 returned API errors as
  successful output).
