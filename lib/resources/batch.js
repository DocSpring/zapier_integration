'use strict'

// Submission batch webhook payload
// (app/serializers/submission_batch_serializer.rb).
module.exports = {
  type: 'SubmissionBatch',
  outputFields: [
    { key: 'state', label: 'State', type: 'string' },
    { key: 'processed_at', label: 'Processed At', type: 'datetime' },
    { key: 'total_count', label: 'Total Count', type: 'integer' },
    { key: 'pending_count', label: 'Pending Count', type: 'integer' },
    { key: 'error_count', label: 'Error Count', type: 'integer' },
    {
      key: 'completion_percentage',
      label: 'Completion Percentage',
      type: 'number',
    },
    // `metadata` is a freeform object — present in the sample only (see submission.js).
  ],
  sample: {
    resource_id: 'sbb_000000000000000001',
    state: 'processed',
    processed_at: '2026-06-30T12:00:00Z',
    total_count: 10,
    pending_count: 0,
    error_count: 0,
    completion_percentage: 100,
    metadata: { import_id: 42 },
  },
}
