'use strict'

const { API_PREFIX } = require('../lib/constants')
const { throwForApiError } = require('../lib/middleware')
const {
  resourceCreateFields,
  resourceCreateSample,
} = require('../lib/resources')

const perform = async (z, bundle) => {
  const input = bundle.inputData || {}

  // Direct lookup by ID when provided. A 404 means "not found", which a Zapier
  // search must report as an empty result (this is what enables
  // "find or create" Zap steps) — not as an error.
  if (input.submission_id) {
    const response = await z.request({
      url: `${API_PREFIX}/submissions/${input.submission_id}`,
      skipThrowForStatus: true,
    })
    if (response.status === 404) return []
    throwForApiError(response, z)
    return response.data ? [response.data] : []
  }

  const response = await z.request({
    url: `${API_PREFIX}/submissions`,
    params: {
      limit: 20,
      type: input.type || undefined,
      created_after: input.created_after || undefined,
      created_before: input.created_before || undefined,
      include_data: true,
    },
  })
  return (response.data && response.data.submissions) || []
}

module.exports = {
  key: 'find_submission',
  noun: 'PDF Submission',
  display: {
    label: 'Find Submission',
    description:
      'Find a submission by ID, or list recent submissions filtered by date or mode.',
  },
  operation: {
    inputFields: [
      {
        key: 'submission_id',
        label: 'Submission ID',
        type: 'string',
        required: false,
        helpText:
          'Look up a specific submission (sub_...). Overrides the filters below.',
      },
      {
        key: 'type',
        label: 'Mode',
        type: 'string',
        required: false,
        choices: [
          { value: 'live', sample: 'live', label: 'Live' },
          { value: 'test', sample: 'test', label: 'Test' },
        ],
      },
      {
        key: 'created_after',
        label: 'Created After',
        type: 'datetime',
        required: false,
      },
      {
        key: 'created_before',
        label: 'Created Before',
        type: 'datetime',
        required: false,
      },
    ],
    perform,
    outputFields: resourceCreateFields('submission'),
    sample: resourceCreateSample('submission'),
  },
}
