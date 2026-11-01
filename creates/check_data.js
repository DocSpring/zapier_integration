'use strict'

const { apiPath, apiRequest } = require('../lib/api')
const { compact, parseJson, seg, text } = require('../lib/util')
const {
  dataFromInputs,
  dataJsonInput,
  templateSchemaFields,
  templateDropdown,
  templateVersionInput,
  testInput,
} = require('../lib/templates')
const { testValue } = require('../lib/submissionInputs')
const { submissionValidation } = require('../lib/resources/other')
const {
  emailMode,
  emailOptionFields,
  emailSettings,
  sendEmailInput,
  signingOrderInput,
} = require('../lib/signerEmails')

// Checks data against a template without creating a submission, generating
// anything or using credits. A mismatch isn't an error here: the result says
// `valid: false` and has the error that creating it would return, so a later
// step (a Filter or Paths) can act on it. With signature requests, it also
// checks the email settings Create Signature Request would send; without
// them, the API refuses those settings, so they're left out.
// A blank value in a signature request (`"email": ""` from an empty mapped
// field) is left out: API v2 refuses blank text.
function withoutBlankText(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    return request
  }
  const out = {}
  Object.keys(request).forEach((key) => {
    const value = request[key]
    if (typeof value === 'string' && value.trim() === '') return
    out[key] = value
  })
  return out
}

const perform = async (z, bundle) => {
  const input = bundle.inputData || {}
  const parsed = parseJson(
    z,
    input.signature_requests,
    'Signature Requests',
    'array'
  )
  const signatureRequests = parsed && parsed.map(withoutBlankText)
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
      signature_requests: signatureRequests,
      ...(signatureRequests ? emailSettings(z, input) : {}),
    }),
  })
  return response.data
}

// DocSpring's email options when it emails the signers, then the template's
// fields.
async function dynamicFields(z, bundle) {
  const input = bundle.inputData || {}
  let mode = 'docspring'
  try {
    mode = emailMode(z, input)
  } catch (_e) {
    // An invalid choice is reported by perform; show DocSpring's options meanwhile.
  }
  const fields = await templateSchemaFields({ optional: true })(z, bundle)
  return (mode === 'docspring' ? emailOptionFields : []).concat(fields)
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
          '`[{"name": "Jane Doe", "email": "jane@example.com", "fields": ["signature"]}]`. ' +
          'Emails to Signers, Signing Order and the email options apply only with signature requests.',
      },
      sendEmailInput,
      signingOrderInput,
      dataJsonInput(),
      // Every field is optional here, so the check can report missing ones.
      dynamicFields,
    ],
    perform,
    outputFields: submissionValidation.outputFields,
    sample: submissionValidation.sample,
  },
}
