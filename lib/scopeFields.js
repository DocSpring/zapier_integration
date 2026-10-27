'use strict'

// Optional filters for webhook triggers. Leaving them blank subscribes to the
// event across the whole account. They map to the webhook's `template_ids`,
// `folder_ids` (combined with OR) and `mode`.
//
// API v2 rejects a scope list on an event type it doesn't apply to, so each
// trigger offers only the filters that apply:
//   template_ids: submission, signature request and template events
//   folder_ids:   submission, signature request, template and folder events
//   mode:         events about test or live records (submissions, signature
//                 requests, combined PDFs, batches, custom files); template
//                 and folder events go to webhooks of every mode
// The resources whose events API v2 can filter by template (the server's
// Webhook::TEMPLATE_SCOPABLE_RESOURCES; signature requests are
// `submission_data_request` there).
const TEMPLATE_FILTERABLE = ['submission', 'signature_request', 'template']
const TEMPLATE_FILTERABLE_TEXT =
  'submission, signature request and template events'

const TEMPLATE_SCOPE = {
  key: 'template_ids',
  label: 'Templates',
  type: 'string',
  list: true,
  required: false,
  dynamic: 'template_choices.id.label',
  helpText:
    'Only trigger for these templates. Leave blank for all templates. ' +
    `(Only ${TEMPLATE_FILTERABLE_TEXT} can be filtered by template.)`,
}

const FOLDER_SCOPE = {
  key: 'folder_ids',
  label: 'Folders',
  type: 'string',
  list: true,
  required: false,
  dynamic: 'folder_choices.id.label',
  helpText:
    'Only trigger for templates in these folders (and their subfolders). Leave blank for all.',
}

const MODE = {
  key: 'mode',
  label: 'Mode',
  type: 'string',
  required: false,
  choices: [
    { value: 'live', sample: 'live', label: 'Live only' },
    { value: 'test', sample: 'test', label: 'Test only' },
  ],
  helpText: 'Only trigger for live or test records. Leave blank for both.',
}

module.exports = {
  TEMPLATE_FILTERABLE,
  TEMPLATE_FILTERABLE_TEXT,
  // submission.*, signature_request.*
  standard: [TEMPLATE_SCOPE, FOLDER_SCOPE, MODE],
  // template.*
  withoutMode: [TEMPLATE_SCOPE, FOLDER_SCOPE],
  // folder.*
  folderOnly: [FOLDER_SCOPE],
  // combined_pdf.*, submission_batch.*, custom_file.*
  modeOnly: [MODE],
}
