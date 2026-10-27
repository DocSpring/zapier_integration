'use strict'

const { apiPath, apiRequest } = require('../lib/api')
const { seg, text } = require('../lib/util')
const { signatureRequestToken } = require('../lib/resources/other')

const perform = async (z, bundle) => {
  const input = bundle.inputData || {}
  const response = await apiRequest(z, {
    url: apiPath(
      'signature_requests',
      seg(input.signature_request_id),
      'tokens'
    ),
    method: 'POST',
    body: { type: text(input.type) || 'email' },
  })
  return response.data
}

module.exports = {
  key: 'create_signing_link',
  noun: 'Signing Link',
  display: {
    label: 'Create Signing Link',
    description:
      'Creates a link that opens a signature request without signing in to DocSpring, to send to the signer.',
  },
  operation: {
    inputFields: [
      {
        key: 'signature_request_id',
        label: 'Signature Request ID',
        type: 'string',
        required: true,
        helpText: 'The signature request to open (`srq_…`).',
      },
      {
        key: 'type',
        label: 'Link Type',
        type: 'string',
        required: false,
        default: 'email',
        choices: [
          {
            value: 'email',
            sample: 'email',
            label: 'Email link (opens for 7 days)',
          },
          {
            value: 'api',
            sample: 'api',
            label: 'Link to open now (opens for 24 hours)',
          },
        ],
        helpText:
          'An email link opens the signature request for 7 days; a link to open now, for 24 hours. ' +
          'A form that opened in time keeps working for 7 more days.',
      },
    ],
    perform,
    outputFields: signatureRequestToken.outputFields,
    sample: signatureRequestToken.sample,
  },
}
