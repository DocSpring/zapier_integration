'use strict'

const { apiPath } = require('../lib/api')
const { seg } = require('../lib/util')
const submission = require('../lib/resources/submission')

const perform = async (z, bundle) => {
  const response = await z.request({
    url: apiPath('submissions', seg(bundle.inputData.submission_id)),
    method: 'DELETE',
  })
  return response.data
}

module.exports = {
  key: 'expire_submission',
  noun: 'Submission',
  display: {
    label: 'Expire Submission',
    description:
      "Expires a submission now: deletes its data, metadata and PDF. This can't be undone.",
  },
  operation: {
    inputFields: [
      {
        key: 'submission_id',
        label: 'Submission ID',
        type: 'string',
        required: true,
        helpText: 'The ID of the submission to expire (`sub_…`).',
      },
    ],
    perform,
    outputFields: submission.outputFields,
    sample: {
      ...submission.sample,
      data: null,
      metadata: {},
      files: {},
      expired: true,
      expires_at: '2026-10-27T10:00:00Z',
    },
  },
}
