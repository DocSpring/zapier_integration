'use strict'

// Submission webhook payload (app/serializers/submission_serializer.rb). The
// event envelope (id/event/timestamp/resource_type/resource_id) is added by
// resources/index.js; these are the resource-specific fields.
module.exports = {
  type: 'Submission',
  outputFields: [
    { key: 'state', label: 'State', type: 'string' },
    { key: 'test', label: 'Test Mode', type: 'boolean' },
    { key: 'template_id', label: 'Template ID', type: 'string' },
    { key: 'template_type', label: 'Template Type', type: 'string' },
    { key: 'template_version', label: 'Template Version', type: 'string' },
    { key: 'processed_at', label: 'Processed At', type: 'datetime' },
    { key: 'expired', label: 'Expired', type: 'boolean' },
    { key: 'expires_at', label: 'Expires At', type: 'datetime' },
    { key: 'download_url', label: 'Download URL', type: 'string' },
    {
      key: 'permanent_download_url',
      label: 'Permanent Download URL',
      type: 'string',
    },
    {
      key: 'preview_download_url',
      label: 'Preview Download URL',
      type: 'string',
    },
    {
      key: 'audit_trail_download_url',
      label: 'Audit Trail Download URL',
      type: 'string',
    },
    { key: 'pdf_hash', label: 'PDF Hash (SHA-256)', type: 'string' },
    { key: 'editable', label: 'Editable', type: 'boolean' },
    { key: 'error_message', label: 'Error Message', type: 'string' },
    { key: 'source', label: 'Source', type: 'string' },
    // `metadata` and `data` are freeform objects — left out of the declared
    // output fields (Zapier has no object type) but present in the sample, so
    // they still surface for mapping. Declaring them would trip D024.
  ],
  sample: {
    resource_id: 'sub_000000000000000001',
    state: 'processed',
    test: true,
    template_id: 'tpl_000000000000000001',
    template_type: 'pdf',
    template_version: '1',
    processed_at: '2026-06-30T12:00:00Z',
    expired: false,
    expires_at: null,
    download_url:
      'https://api.docspring.com/api/v1/submissions/sub_000000000000000001/download.pdf',
    permanent_download_url:
      'https://api.docspring.com/submissions/sub_000000000000000001/download',
    preview_download_url: null,
    audit_trail_download_url: null,
    pdf_hash: 'd41d8cd98f00b204e9800998ecf8427e',
    editable: false,
    error_message: null,
    source: 'api',
    metadata: { user_id: 1234 },
    data: { name: 'Jane Doe', email: 'jane@example.com' },
  },
}
