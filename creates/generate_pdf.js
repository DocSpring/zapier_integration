'use strict'

const { apiPath } = require('../lib/api')
const { SUBMISSION, createAndWait } = require('../lib/records')
const { seg, text } = require('../lib/util')
const {
  dataJsonInput,
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
    wait: shouldWait(z, input, 'Wait for the Submission?'),
  })
}

module.exports = {
  key: 'generate_pdf',
  noun: 'Submission',
  display: {
    label: 'Create Submission',
    description:
      "Fills in a template and makes a submission: a PDF, or a Word template's Word document or OpenDocument file. Choose a template to see its fields.",
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
      {
        ...pdfPassphraseInput,
        helpText:
          pdfPassphraseInput.helpText +
          " A submission with a passphrase can't make a Word document or OpenDocument file.",
      },
      expiresInInput,
      editableInput,
      fieldOverridesInput,
      waitInput('submission'),
      dataJsonInput(),
      templateSchemaFields(),
    ],
    perform,
    outputFields: submission.outputFields,
    sample: submission.sample,
  },
}
