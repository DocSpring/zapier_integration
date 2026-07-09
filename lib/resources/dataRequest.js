'use strict'

// Submission data request webhook payload — an explicit hash
// (app/models/submission_data_request.rb #webhook_payload), not a serializer.
module.exports = {
  type: 'SubmissionDataRequest',
  outputFields: [
    { key: 'submission_id', label: 'Submission ID', type: 'string' },
    { key: 'name', label: 'Name', type: 'string' },
    { key: 'email', label: 'Email', type: 'string' },
    { key: 'completed_at', label: 'Completed At', type: 'datetime' },
    { key: 'fields', label: 'Fields', type: 'string', list: true },
  ],
  sample: {
    resource_id: 'drq_000000000000000001',
    submission_id: 'sub_000000000000000001',
    name: 'Jane Doe',
    email: 'jane@example.com',
    completed_at: '2026-06-30T12:00:00Z',
    fields: ['signature', 'date'],
  },
}
