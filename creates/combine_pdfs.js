'use strict'

const { apiPath } = require('../lib/api')
const { COMBINED_PDF, createAndWait } = require('../lib/records')
const {
  compact,
  isBlank,
  parseJson,
  text,
  toBoolean,
  toInteger,
} = require('../lib/util')
const {
  metadataInput,
  pdfPassphraseInput,
  expiresInInput,
  waitInput,
} = require('../lib/templates')
const { shouldWait } = require('../lib/submissionInputs')
const combinedPdf = require('../lib/resources/combinedPdf')

const SOURCE_TYPES = [
  { value: 'submission', sample: 'submission', label: 'Submission' },
  { value: 'combined_pdf', sample: 'combined_pdf', label: 'Combined PDF' },
  { value: 'template', sample: 'template', label: 'Template' },
  { value: 'custom_file', sample: 'custom_file', label: 'Custom File' },
  { value: 'url', sample: 'url', label: 'URL' },
]
const ID_TYPES = ['submission', 'combined_pdf', 'template', 'custom_file']

// Each source takes only its type's properties (API v2 rejects any other):
// `id` for a submission, combined PDF, template or custom file, `url` for a
// URL, and `template_version` and `processed` only for a template.
function sourcePdf(z, row, number) {
  const type = text(row.type) || 'submission'
  if (type === 'url') {
    const url = text(row.url)
    if (!url)
      throw new z.errors.Error(
        `Source PDF ${number} needs a URL.`,
        'InvalidInput',
        400
      )
    return { type, url }
  }
  if (!ID_TYPES.includes(type)) {
    throw new z.errors.Error(
      `Source PDF ${number} has an unknown type "${type}".`,
      'InvalidInput',
      400
    )
  }
  const id = text(row.id)
  if (!id)
    throw new z.errors.Error(
      `Source PDF ${number} needs an ID.`,
      'InvalidInput',
      400
    )
  if (type !== 'template') return { type, id }
  return compact({
    type,
    id,
    template_version: text(row.template_version),
    processed: toBoolean(z, row.processed, `Source PDF ${number} Processed`),
  })
}

const perform = async (z, bundle) => {
  const input = bundle.inputData || {}
  // Skip wholly blank line items; a row with a type but no ID or URL is an error.
  const rows = (
    Array.isArray(input.source_pdfs) ? input.source_pdfs : []
  ).filter((row) => row && !Object.values(row).every(isBlank))
  if (rows.length === 0) {
    throw new z.errors.Error(
      'Add at least one source PDF.',
      'InvalidInput',
      400
    )
  }
  return createAndWait(z, bundle, {
    kind: COMBINED_PDF,
    path: apiPath('combined_pdfs'),
    body: compact({
      source_pdfs: rows.map((row, i) => sourcePdf(z, row, i + 1)),
      metadata: parseJson(z, input.metadata, 'Metadata'),
      password: text(input.pdf_passphrase),
      expires_in: toInteger(z, input.expires_in, 'Expires In'),
    }),
    wait: shouldWait(z, input, 'Wait for the PDF?'),
  })
}

module.exports = {
  key: 'combine_pdfs',
  noun: 'Combined PDF',
  display: {
    label: 'Combine PDFs',
    description:
      'Merges submissions, combined PDFs, templates, custom files and PDFs from URLs into one PDF.',
  },
  operation: {
    inputFields: [
      {
        key: 'source_pdfs',
        label: 'Source PDFs',
        required: true,
        children: [
          {
            key: 'type',
            label: 'Type',
            type: 'string',
            required: false,
            choices: SOURCE_TYPES,
            helpText: 'What the PDF is. Default: a submission.',
          },
          {
            key: 'id',
            label: 'ID',
            type: 'string',
            required: false,
            helpText:
              'The submission (`sub_…`), combined PDF (`com_…`), template (`tpl_…`) or custom file (`cfi_…`) ID.',
          },
          {
            key: 'url',
            label: 'URL',
            type: 'string',
            required: false,
            helpText: 'For a URL source: the link to download the PDF from.',
          },
          {
            key: 'template_version',
            label: 'Template Version',
            type: 'string',
            required: false,
            helpText:
              'For a template source: a published version, `latest` or `draft`. Default: latest.',
          },
          {
            key: 'processed',
            label: "Template's Processed PDF?",
            type: 'boolean',
            required: false,
            helpText:
              'For a template source: Yes (the default) uses the PDF that submissions are filled in on; No uses the PDF as it was uploaded.',
          },
        ],
      },
      {
        ...metadataInput,
        helpText:
          'Your own data about the combined PDF, such as an ID from your app.',
      },
      pdfPassphraseInput,
      {
        ...expiresInInput,
        helpText:
          'Seconds after the PDF is generated until it expires and is deleted (up to 315360000, 10 years). Leave blank to keep it.',
      },
      waitInput('PDF'),
    ],
    perform,
    outputFields: combinedPdf.outputFields,
    sample: combinedPdf.sample,
  },
}
