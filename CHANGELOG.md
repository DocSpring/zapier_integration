# Changelog

## 2.1.1

- Email Subject and Message take DocSpring's variables in square brackets:
  `[[ signer.name ]]`, `[[ signer.email ]]`, `[[ document.name ]]`, `[[ sender.name ]]`
  and `[[ account.name ]]`, sent to DocSpring as `{{ signer.name }}` and so on. Zapier
  reads `{{ }}` as its own fields, so a typed `{{ signer.name }}` came out empty. Other
  text in square brackets is sent as typed. Check Data sends them the same way.
- Email Subject's help gives the default subject as "_Sender_ sent you _document_ to sign":
  Zapier dropped the `<your name>` and `<document>` it said before.
- An error lists each problem once: the details the message already names no longer get a
  line of their own as well.

## 2.1.0

Needs a DocSpring release that emails signers: older releases refuse `send_email`, so
Create Signature Request, and Check Data with signature requests, would fail on them.
Self-hosted (Enterprise) installs need that release too; until then, keep using 2.0.0.

- **Emails to Signers** on Create Signature Request: DocSpring emails each signer a link
  to sign (the default, as in the API), with any reminders and the signed PDF once
  everyone has signed; or you send the links yourself. With DocSpring's emails you can set
  the subject, a message, CC addresses, reminders, the reply-to address, notification
  emails and a notification each time someone signs, and the step makes no signing links,
  so a Zap can't send a second one. Sending the links yourself works as before, with the
  same link types and every authentication type.
- **Signing Order** (everyone at once, or one step at a time) and each signer's
  **Signing Step**, either way.
- **Check Data** checks the same settings with its signature requests, and defaults each
  one's authentication to an email link, as Create Signature Request does. An empty list
  counts as no signature requests.
- **New triggers:** Signature Request Sent (DocSpring first emailed someone their link)
  and Signature Request Email Bounced.
- **Outputs:** a signature request's `send_email`, `signing_step`, `sent_at` and
  `email_status`, a submission's `signing_order`, and a template's output format and
  signature request email settings.
- **Check Data** leaves out blank values in its JSON signature requests (such as an
  empty mapped email), which API v2 refuses.
- **Word templates:** Output Formats on Generate PDF and Generate PDFs in a Batch offers a
  Word template's Word document (`docx`) and OpenDocument file (`odt`), and Generate
  Submission Files can add them, or a PDF, to a Word template's processed submission. The
  output has their files (`files.docx`, `files.odt`). Leaving Output Formats empty makes
  what the template makes, not always the PDF, as its help now says.
- The samples' template document and page image links use DocSpring's real routes.

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
- **Verified webhooks.** Triggers check each delivery's `X-DocSpring-Signature` with
  the webhook's signing secret (kept with the subscription) and drop any that don't
  match.
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
