'use strict'

const { apiPath } = require('../lib/api')
const { SUBMISSION_BATCH, createAndWait } = require('../lib/records')
const { compact, isBlank, parseJson, text } = require('../lib/util')
const {
  templateDropdown,
  templateVersionInput,
  testInput,
  metadataInput,
  waitInput,
} = require('../lib/templates')
const {
  outputFormatsInput,
  testValue,
  outputFormats,
  shouldWait,
} = require('../lib/submissionInputs')
const submissionBatch = require('../lib/resources/submissionBatch')

// The batch's submissions: line items (one row per PDF, each with its data and
// metadata as JSON), or one JSON list with every property of a submission.
function batchSubmissions(z, input) {
  const fromJson = parseJson(
    z,
    input.submissions_json,
    'Submissions (JSON)',
    'array'
  )
  const rows = (
    Array.isArray(input.submissions) ? input.submissions : []
  ).filter((row) => row && !Object.values(row).every(isBlank))
  if (fromJson && rows.length) {
    throw new z.errors.Error(
      'Use either Submissions or Submissions (JSON), not both.',
      'InvalidInput',
      400
    )
  }
  if (fromJson) return fromJson
  return rows.map((row, i) =>
    compact({
      data: parseJson(z, row.submission_data, `Submission ${i + 1} Data`) || {},
      metadata: parseJson(
        z,
        row.submission_metadata,
        `Submission ${i + 1} Metadata`
      ),
    })
  )
}

const perform = async (z, bundle) => {
  const input = bundle.inputData || {}
  const submissions = batchSubmissions(z, input)
  if (submissions.length === 0) {
    throw new z.errors.Error(
      'Add at least one submission to the batch.',
      'InvalidInput',
      400
    )
  }
  return createAndWait(z, bundle, {
    kind: SUBMISSION_BATCH,
    path: apiPath('submissions', 'batches'),
    body: compact({
      template_id: text(input.template_id),
      template_version: text(input.version),
      test: testValue(z, input.test),
      metadata: parseJson(z, input.metadata, 'Metadata'),
      output_formats: outputFormats(input.output_formats),
      submissions,
    }),
    wait: shouldWait(z, input, 'Wait for the PDFs?'),
  })
}

module.exports = {
  key: 'generate_pdf_batch',
  noun: 'Submission Batch',
  display: {
    label: 'Generate PDFs in a Batch',
    description:
      'Generates up to 50 PDFs in one request, from one template or several.',
  },
  operation: {
    inputFields: [
      {
        ...templateDropdown,
        required: false,
        altersDynamicFields: false,
        helpText:
          "The template for each submission that doesn't name its own `template_id` (in Submissions (JSON)).",
      },
      { ...templateVersionInput, altersDynamicFields: false },
      testInput,
      {
        ...metadataInput,
        helpText: 'Your own data about the batch, such as an ID from your app.',
      },
      outputFormatsInput,
      {
        key: 'submissions',
        label: 'Submissions',
        required: false,
        children: [
          {
            key: 'submission_data',
            label: 'Data (JSON)',
            type: 'text',
            required: false,
            helpText:
              'The values of the template\'s fields, such as `{"first_name": "Jane"}`.',
          },
          {
            key: 'submission_metadata',
            label: 'Metadata (JSON)',
            type: 'text',
            required: false,
            helpText:
              'Your own data about this submission, such as `{"row": 1}`.',
          },
        ],
      },
      {
        key: 'submissions_json',
        label: 'Submissions (JSON, advanced)',
        type: 'code',
        required: false,
        helpText:
          'Instead of Submissions: a JSON list of up to 50 submissions, each with the properties of Generate PDF ' +
          '(`data`, `metadata`, `test`, `expires_in`, `field_overrides`, …) and its own `template_id` and ' +
          '`template_version` when it uses another template.',
      },
      waitInput('PDFs'),
    ],
    perform,
    outputFields: submissionBatch.outputFields,
    sample: submissionBatch.sample,
  },
}
