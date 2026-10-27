'use strict'

const { apiPath } = require('../lib/api')
const { TEMPLATE, createAndWait } = require('../lib/records')
const { documentInputs, documentSource } = require('../lib/documents')
const { compact, seg, toBoolean } = require('../lib/util')
const { templateInput, waitInput } = require('../lib/templates')
const { shouldWait } = require('../lib/submissionInputs')
const template = require('../lib/resources/template')

const perform = async (z, bundle) => {
  const input = bundle.inputData || {}
  const document = await documentSource(z, input)
  if (Object.keys(document).length === 0) {
    throw new z.errors.Error(
      'Add a PDF URL or a PDF File.',
      'InvalidInput',
      400
    )
  }
  return createAndWait(z, bundle, {
    kind: TEMPLATE,
    method: 'PUT',
    path: apiPath('templates', seg(input.template_id), 'document'),
    body: compact({
      ...document,
      reimport_fields: toBoolean(z, input.reimport_fields, 'Reimport Fields?'),
    }),
    wait: shouldWait(z, input, "Wait for the template's PDF?"),
  })
}

module.exports = {
  key: 'replace_template_pdf',
  noun: 'Template',
  display: {
    label: 'Replace Template PDF',
    description:
      "Replaces a PDF template's PDF, keeping its fields (or importing the new PDF's form fields).",
  },
  operation: {
    inputFields: [
      templateInput,
      ...documentInputs('the new PDF'),
      {
        key: 'reimport_fields',
        label: 'Reimport Fields?',
        type: 'boolean',
        required: false,
        helpText:
          "Replace all of the template's fields with the fillable fields in the new PDF.",
      },
      waitInput("template's PDF"),
    ],
    perform,
    outputFields: template.fullOutputFields,
    sample: template.fullSample,
  },
}
