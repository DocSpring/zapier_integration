'use strict'

const submission = require('./submission')

// A submission batch, as API v2 returns it (`SubmissionBatch`). Its
// submissions' `data` is null unless the request asks for it (and always in
// webhook events).
module.exports = {
  noun: 'Submission Batch',
  outputFields: [
    { key: 'id', label: 'Submission Batch ID', type: 'string' },
    { key: 'state', label: 'State', type: 'string' },
    { key: 'total_count', label: 'Total Count', type: 'integer' },
    { key: 'pending_count', label: 'Pending Count', type: 'integer' },
    { key: 'error_count', label: 'Error Count', type: 'integer' },
    {
      key: 'completion_percentage',
      label: 'Completion Percentage',
      type: 'integer',
    },
    { key: 'submissions[]id', label: 'Submission IDs', type: 'string' },
    { key: 'submissions[]state', label: 'Submission States', type: 'string' },
    {
      key: 'submissions[]error_message',
      label: 'Submission Error Messages',
      type: 'string',
    },
    { key: 'processed_at', label: 'Processed At', type: 'datetime' },
    { key: 'created_at', label: 'Created At', type: 'datetime' },
    { key: 'updated_at', label: 'Updated At', type: 'datetime' },
  ],
  sample: {
    id: 'sbb_1234567890abcdef01',
    state: 'processed',
    metadata: { job_id: 54321 },
    total_count: 1,
    pending_count: 0,
    error_count: 0,
    completion_percentage: 100,
    submissions: [
      { ...submission.sample, batch_id: 'sbb_1234567890abcdef01', data: null },
    ],
    processed_at: '2026-10-27T09:00:05Z',
    created_at: '2026-10-27T09:00:00Z',
    updated_at: '2026-10-27T09:00:05Z',
  },
}
