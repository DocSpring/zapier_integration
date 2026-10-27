'use strict'

const { apiPath } = require('../lib/api')
const { SUBMISSION, createAndWait } = require('../lib/records')
const { seg, text } = require('../lib/util')
const {
  templateSchemaFields,
  templateDropdown,
  templateVersionInput,
  testInput,
  metadataInput,
  pdfPassphraseInput,
  expiresInInput,
  waitInput,
} = require('../lib/templates')
const {
  outputFormatsInput,
  editableInput,
  fieldOverridesInput,
  submissionBody,
  shouldWait,
} = require('../lib/submissionInputs')
const submission = require('../lib/resources/submission')

const perform = async (z, bundle) => {
  const input = bundle.inputData || {}
  return createAndWait(z, bundle, {
    kind: SUBMISSION,
    path: apiPath('templates', seg(input.template_id), 'submissions'),
    params: { version: text(input.version) },
    body: submissionBody(z, input),
    wait: shouldWait(z, input, 'Wait for the PDF?'),
  })
}

module.exports = {
  key: 'generate_pdf',
  noun: 'PDF',
  display: {
    label: 'Generate PDF',
    description:
      'Fills in a template and generates a PDF. Choose a template to see its fields.',
  },
  operation: {
    // The static inputs show straight away; the template's own fields are
    // added after them when a template (and version) is chosen.
    inputFields: [
      templateDropdown,
      templateVersionInput,
      testInput,
      metadataInput,
      outputFormatsInput,
      pdfPassphraseInput,
      expiresInInput,
      editableInput,
      fieldOverridesInput,
      waitInput('PDF'),
      templateSchemaFields(),
    ],
    perform,
    outputFields: submission.outputFields,
    sample: submission.sample,
  },
}
