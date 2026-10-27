'use strict'

const { generatedFileFields, generatedFileSample } = require('./files')

// A combined PDF, as API v2 returns it (`CombinedPdf`).
const ID = 'com_1234567890abcdef01'

module.exports = {
  noun: 'Combined PDF',
  outputFields: [
    { key: 'id', label: 'Combined PDF ID', type: 'string' },
    { key: 'state', label: 'State', type: 'string' },
    { key: 'error_message', label: 'Error Message', type: 'string' },
    ...generatedFileFields('files__pdf', 'PDF'),
    { key: 'source_pdfs[]type', label: 'Source PDF Types', type: 'string' },
    { key: 'source_pdfs[]id', label: 'Source PDF IDs', type: 'string' },
    { key: 'source_pdfs[]url', label: 'Source PDF URLs', type: 'string' },
    { key: 'has_password', label: 'Has Password', type: 'boolean' },
    {
      key: 'delete_custom_files',
      label: 'Delete Custom Files',
      type: 'boolean',
    },
    { key: 'expired', label: 'Expired', type: 'boolean' },
    { key: 'expires_at', label: 'Expires At', type: 'datetime' },
    { key: 'processed_at', label: 'Processed At', type: 'datetime' },
    { key: 'created_at', label: 'Created At', type: 'datetime' },
    { key: 'updated_at', label: 'Updated At', type: 'datetime' },
  ],
  sample: {
    id: ID,
    state: 'processed',
    source_pdfs: [
      { type: 'submission', id: 'sub_1234567890abcdef01' },
      { type: 'url', url: 'https://example.com/terms.pdf' },
    ],
    metadata: { order_id: 5678 },
    has_password: false,
    delete_custom_files: false,
    error_message: null,
    files: { pdf: generatedFileSample(ID, 'combined_pdfs', `${ID}.pdf`) },
    actions: [],
    expired: false,
    expires_at: null,
    processed_at: '2026-10-27T09:00:05Z',
    created_at: '2026-10-27T09:00:00Z',
    updated_at: '2026-10-27T09:00:05Z',
  },
}
