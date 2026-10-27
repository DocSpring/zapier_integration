'use strict'

const { generatedFileFields, generatedFileSample } = require('./files')

// A submission, as API v2 returns it (`Submission`). `data` and `metadata` are
// freeform objects: they're in the sample so they can be mapped, but not
// declared (Zapier has no object output type; check D024).
const ID = 'sub_1234567890abcdef01'

module.exports = {
  noun: 'Submission',
  outputFields: [
    { key: 'id', label: 'Submission ID', type: 'string' },
    { key: 'state', label: 'State', type: 'string' },
    { key: 'test', label: 'Test', type: 'boolean' },
    { key: 'template_id', label: 'Template ID', type: 'string' },
    { key: 'template_type', label: 'Template Type', type: 'string' },
    { key: 'template_version', label: 'Template Version', type: 'string' },
    { key: 'batch_id', label: 'Batch ID', type: 'string' },
    { key: 'source', label: 'Source', type: 'string' },
    { key: 'editable', label: 'Editable', type: 'boolean' },
    { key: 'error_message', label: 'Error Message', type: 'string' },
    { key: 'data_errors[]pointer', label: 'Data Error Fields', type: 'string' },
    {
      key: 'data_errors[]message',
      label: 'Data Error Messages',
      type: 'string',
    },
    { key: 'has_password', label: 'Has Password', type: 'boolean' },
    {
      key: 'output_formats',
      label: 'Output Formats',
      type: 'string',
      list: true,
    },
    ...generatedFileFields('files__pdf', 'PDF'),
    ...generatedFileFields('files__audit_trail', 'Audit Trail'),
    ...generatedFileFields('files__preview', 'Preview PDF'),
    { key: 'files__png__state', label: 'Page Images State', type: 'string' },
    {
      key: 'files__png__page_count',
      label: 'Page Images Count',
      type: 'integer',
    },
    {
      key: 'files__png__pages[]download_url',
      label: 'Page Image Download URLs',
      type: 'string',
    },
    { key: 'expired', label: 'Expired', type: 'boolean' },
    { key: 'expires_at', label: 'Expires At', type: 'datetime' },
    { key: 'processed_at', label: 'Processed At', type: 'datetime' },
    { key: 'created_at', label: 'Created At', type: 'datetime' },
    { key: 'updated_at', label: 'Updated At', type: 'datetime' },
  ],
  sample: {
    id: ID,
    template_id: 'tpl_1234567890abcdef01',
    template_type: 'pdf',
    template_version: '1.0.0',
    batch_id: null,
    source: 'api',
    state: 'processed',
    test: true,
    editable: false,
    data: { first_name: 'Jane', last_name: 'Doe' },
    data_errors: [],
    error_message: null,
    metadata: { user_id: 42 },
    has_password: false,
    signature_requests: [],
    actions: [],
    truncated_text: {},
    output_formats: ['pdf'],
    files: { pdf: generatedFileSample(ID, 'submissions', `${ID}.pdf`) },
    preview_generated_at: null,
    expired: false,
    expires_at: null,
    processed_at: '2026-10-27T09:00:03Z',
    created_at: '2026-10-27T09:00:00Z',
    updated_at: '2026-10-27T09:00:03Z',
  },
}
