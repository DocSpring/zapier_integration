'use strict'

const {
  asArray,
  compact,
  parseJson,
  text,
  toBoolean,
  toInteger,
} = require('./util')
const { dataFromInputs } = require('./templates')

// Inputs shared by the operations that create submissions.

const outputFormatsInput = {
  key: 'output_formats',
  label: 'Output Formats',
  type: 'string',
  list: true,
  required: false,
  choices: [
    { value: 'pdf', sample: 'pdf', label: 'PDF' },
    { value: 'png', sample: 'png', label: 'PNG images of each page' },
  ],
  helpText:
    'What to make: the PDF (always), and a PNG image of each page when you add `png`. Default: the PDF.',
}

const editableInput = {
  key: 'editable',
  label: 'Editable PDF?',
  type: 'boolean',
  required: false,
  helpText:
    "Yes keeps the PDF's fields fillable; No flattens them. Leave blank to use the template's setting.",
}

const fieldOverridesInput = {
  key: 'field_overrides',
  label: 'Field Overrides (JSON, advanced)',
  type: 'code',
  required: false,
  helpText:
    'Changes to field settings for this PDF only, by field name, such as `{"name": {"required": false, "font_size": 9}}`.',
}

// `test` is only sent when it's true: API v2 rejects `test: false` from a test
// API token, and a live token makes live PDFs without it.
function testValue(z, value) {
  return toBoolean(z, value, 'Test PDF?') ? true : undefined
}

function outputFormats(value) {
  const formats = asArray(value)
  return formats.length ? formats : undefined
}

// The body for POST /templates/{template_id}/submissions (Generate PDF).
function submissionBody(z, input) {
  return compact({
    data: dataFromInputs(z, input),
    test: testValue(z, input.test),
    metadata: parseJson(z, input.metadata, 'Metadata'),
    password: text(input.pdf_passphrase),
    expires_in: toInteger(z, input.expires_in, 'Expires In'),
    editable: toBoolean(z, input.editable, 'Editable PDF?'),
    output_formats: outputFormats(input.output_formats),
    field_overrides: parseJson(z, input.field_overrides, 'Field Overrides'),
  })
}

// Whether to wait for the file: yes unless the user chose No.
function shouldWait(z, input, label) {
  return toBoolean(z, input.wait, label) !== false
}

module.exports = {
  outputFormatsInput,
  editableInput,
  fieldOverridesInput,
  testValue,
  outputFormats,
  submissionBody,
  shouldWait,
}
