'use strict'

const { apiPath, apiRequest } = require('../lib/api')
const { compact, parseJson, seg, text } = require('../lib/util')
const {
  dataFromInputs,
  templateSchemaFields,
  templateDropdown,
  templateVersionInput,
  testInput,
} = require('../lib/templates')
const { testValue } = require('../lib/submissionInputs')
const { submissionValidation } = require('../lib/resources/other')

// Checks data against a template without creating a submission, generating
// anything or using credits. A mismatch isn't an error here: the result says
// `valid: false` and has the error that creating it would return, so a later
// step (a Filter or Paths) can act on it.
const perform = async (z, bundle) => {
  const input = bundle.inputData || {}
  const response = await apiRequest(z, {
    url: apiPath(
      'templates',
      seg(input.template_id),
      'submissions',
      'validate'
    ),
    method: 'POST',
    params: compact({ version: text(input.version) }),
    body: compact({
      data: dataFromInputs(z, input),
      test: testValue(z, input.test),
      signature_requests: parseJson(
        z,
        input.signature_requests,
        'Signature Requests',
        'array'
      ),
    }),
  })
  return response.data
}

module.exports = {
  key: 'check_data',
  noun: 'Data Check',
  display: {
    label: 'Check Data',
    description:
      "Checks data against a template's fields without generating a PDF or using credits. Returns whether it's valid, and why not.",
  },
  operation: {
    inputFields: [
      templateDropdown,
      templateVersionInput,
      testInput,
      {
        key: 'signature_requests',
        label: 'Signature Requests (JSON, advanced)',
        type: 'code',
        required: false,
        helpText:
          'To check signature requests too: a JSON list, such as ' +
          '`[{"name": "Jane Doe", "email": "jane@example.com", "fields": ["signature"], "auth_type": "email_link"}]`.',
      },
      // Every field is optional here, so the check can report missing ones.
      templateSchemaFields({ optional: true }),
    ],
    perform,
    outputFields: submissionValidation.outputFields,
    sample: submissionValidation.sample,
  },
}
