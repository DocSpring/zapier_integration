'use strict'

const { apiPath } = require('../lib/api')
const { TEMPLATE, createAndWait } = require('../lib/records')
const { documentInputs, documentSource, isRoot } = require('../lib/documents')
const { compact, text, toBoolean } = require('../lib/util')
const { folderInput, waitInput } = require('../lib/templates')
const { shouldWait } = require('../lib/submissionInputs')
const template = require('../lib/resources/template')

const choice = (value, label) => ({ value, sample: value, label })

const perform = async (z, bundle) => {
  const input = bundle.inputData || {}
  const templateType = text(input.template_type) || 'pdf'
  const document = await documentSource(z, input)
  if (templateType === 'pdf' && Object.keys(document).length === 0) {
    throw new z.errors.Error(
      'A PDF template needs a PDF URL or a PDF File.',
      'InvalidInput',
      400
    )
  }
  return createAndWait(z, bundle, {
    kind: TEMPLATE,
    path: apiPath('templates'),
    body: compact({
      name: text(input.name),
      template_type: templateType,
      parent_folder_id: isRoot(input.parent_folder_id)
        ? undefined
        : text(input.parent_folder_id),
      ...document,
      detect_fields: toBoolean(
        z,
        input.detect_fields,
        'Detect Fields With AI?'
      ),
      field_source: text(input.field_source),
      field_naming: text(input.field_naming),
      field_logic: text(input.field_logic),
      html: text(input.html),
      scss: text(input.scss),
      header_html: text(input.header_html),
      footer_html: text(input.footer_html),
    }),
    wait: shouldWait(z, input, "Wait for the template's PDF?"),
  })
}

module.exports = {
  key: 'create_template',
  noun: 'Template',
  display: {
    label: 'Create Template',
    description:
      'Creates a template from a PDF (optionally setting up its fields with AI) or from HTML.',
  },
  operation: {
    inputFields: [
      { key: 'name', label: 'Name', type: 'string', required: true },
      {
        key: 'template_type',
        label: 'Template Type',
        type: 'string',
        required: true,
        default: 'pdf',
        choices: [
          choice('pdf', 'PDF: fields placed on a PDF'),
          choice('html', 'HTML: a PDF made from HTML and SCSS'),
        ],
      },
      folderInput({
        helpText:
          'The folder to put the template in. Leave blank (or enter `root`) for the top level.',
      }),
      ...documentInputs('the PDF (PDF templates)'),
      {
        key: 'detect_fields',
        label: 'Detect Fields With AI?',
        type: 'boolean',
        required: false,
        helpText:
          'PDF templates: import the form fields of a fillable PDF or detect them, name them with AI and set up ' +
          'conditional logic, as the "Automatically detect fields" upload option does.',
      },
      {
        key: 'field_source',
        label: 'Field Source',
        type: 'string',
        required: false,
        choices: [
          choice('auto', 'Auto: import fillable fields, or detect them'),
          choice('pdf_detection', 'Detect the fields from the page'),
          choice('pdf_form_fields', "Import the PDF's form fields"),
        ],
        helpText:
          'With Detect Fields: where the fields come from. Default: Auto.',
      },
      {
        key: 'field_naming',
        label: 'Field Naming',
        type: 'string',
        required: false,
        choices: [
          choice('ai', 'Name them with AI'),
          choice('preserve', "Keep the PDF's field names"),
        ],
        helpText: 'With Detect Fields: how the fields are named. Default: AI.',
      },
      {
        key: 'field_logic',
        label: 'Field Logic',
        type: 'string',
        required: false,
        choices: [
          choice('ai', 'Set up conditional logic with AI'),
          choice('none', 'None'),
        ],
        helpText:
          "With Detect Fields: whether AI sets up conditional logic and required fields. Default: your account's setting.",
      },
      {
        key: 'html',
        label: 'HTML',
        type: 'text',
        required: false,
        helpText: 'HTML templates: the HTML, as a Liquid template.',
      },
      {
        key: 'scss',
        label: 'SCSS',
        type: 'text',
        required: false,
        helpText: 'HTML templates: the SCSS.',
      },
      {
        key: 'header_html',
        label: 'Header HTML',
        type: 'text',
        required: false,
        helpText: 'HTML templates: printed at the top of each page.',
      },
      {
        key: 'footer_html',
        label: 'Footer HTML',
        type: 'text',
        required: false,
        helpText: 'HTML templates: printed at the bottom of each page.',
      },
      waitInput("template's PDF"),
    ],
    perform,
    outputFields: template.fullOutputFields,
    sample: template.fullSample,
  },
}
