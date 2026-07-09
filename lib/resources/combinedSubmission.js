'use strict'

// Combined submission webhook payload
// (app/serializers/combined_submission_serializer.rb).
module.exports = {
  type: 'CombinedSubmission',
  outputFields: [
    { key: 'state', label: 'State', type: 'string' },
    { key: 'processed_at', label: 'Processed At', type: 'datetime' },
    { key: 'expired', label: 'Expired', type: 'boolean' },
    { key: 'expires_at', label: 'Expires At', type: 'datetime' },
    { key: 'error_message', label: 'Error Message', type: 'string' },
    { key: 'download_url', label: 'Download URL', type: 'string' },
    { key: 'pdf_hash', label: 'PDF Hash (SHA-256)', type: 'string' },
    {
      key: 'submission_ids',
      label: 'Submission IDs',
      type: 'string',
      list: true,
    },
    // `metadata` is a freeform object — present in the sample only (see submission.js).
  ],
  sample: {
    resource_id: 'com_000000000000000001',
    state: 'processed',
    processed_at: '2026-06-30T12:00:00Z',
    expired: false,
    expires_at: null,
    error_message: null,
    download_url:
      'https://api.docspring.com/api/v1/combined_submissions/com_000000000000000001/download.pdf',
    pdf_hash: 'd41d8cd98f00b204e9800998ecf8427e',
    submission_ids: ['sub_000000000000000001', 'sub_000000000000000002'],
    metadata: { order_id: 5678 },
  },
}
