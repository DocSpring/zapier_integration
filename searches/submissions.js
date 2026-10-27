'use strict'

const { apiPath, getOrNull, listPage } = require('../lib/api')
const { compact, seg, text, toBoolean, toInteger } = require('../lib/util')
const submission = require('../lib/resources/submission')
const submissionBatch = require('../lib/resources/submissionBatch')
const combinedPdf = require('../lib/resources/combinedPdf')
const signatureRequest = require('../lib/resources/signatureRequest')

// Searches that get one record by its ID. A record that doesn't exist (a 404)
// is "not found" (an empty result), so a Zap can find or create.
function getById({
  key,
  noun,
  label,
  description,
  idKey,
  idLabel,
  idHelp,
  idInput,
  path,
  extraInputs = [],
  params,
  resource,
}) {
  return {
    key,
    noun,
    display: { label, description },
    operation: {
      inputFields: [
        idInput || {
          key: idKey,
          label: idLabel,
          type: 'string',
          required: true,
          helpText: idHelp,
        },
        ...extraInputs,
      ],
      perform: async (z, bundle) => {
        const input = bundle.inputData || {}
        const record = await getOrNull(
          z,
          bundle,
          path(seg(input[idKey])),
          params ? compact(params(z, input)) : undefined
        )
        return record ? [record] : []
      },
      outputFields: resource.outputFields,
      sample: resource.sample,
    },
  }
}

const getSubmission = getById({
  key: 'get_submission',
  noun: 'Submission',
  label: 'Get Submission',
  description:
    'Gets a submission by its ID, with its data and the links to its PDF.',
  idKey: 'submission_id',
  idLabel: 'Submission ID',
  idHelp: 'The submission ID (`sub_…`).',
  path: (id) => apiPath('submissions', id),
  resource: submission,
})

const getSubmissionBatch = getById({
  key: 'get_submission_batch',
  noun: 'Submission Batch',
  label: 'Get Submission Batch',
  description: 'Gets a submission batch by its ID, with its submissions.',
  idKey: 'submission_batch_id',
  idLabel: 'Submission Batch ID',
  idHelp: 'The submission batch ID (`sbb_…`).',
  path: (id) => apiPath('submissions', 'batches', id),
  extraInputs: [
    {
      key: 'include_data',
      label: 'Include Data?',
      type: 'boolean',
      required: false,
      helpText: "Include each submission's data.",
    },
  ],
  params: (z, input) => ({
    include_data: toBoolean(z, input.include_data, 'Include Data?'),
  }),
  resource: submissionBatch,
})

const getCombinedPdf = getById({
  key: 'get_combined_pdf',
  noun: 'Combined PDF',
  label: 'Get Combined PDF',
  description: 'Gets a combined PDF by its ID, with the links to its PDF.',
  idKey: 'combined_pdf_id',
  idLabel: 'Combined PDF ID',
  idHelp: 'The combined PDF ID (`com_…`).',
  path: (id) => apiPath('combined_pdfs', id),
  resource: combinedPdf,
})

const getSignatureRequest = getById({
  key: 'get_signature_request',
  noun: 'Signature Request',
  label: 'Get Signature Request',
  description:
    'Gets a signature request by its ID: who it is for, its fields and whether it has been completed.',
  idKey: 'signature_request_id',
  idLabel: 'Signature Request ID',
  idHelp: 'The signature request ID (`srq_…`).',
  path: (id) => apiPath('signature_requests', id),
  resource: signatureRequest,
})

// Find Submissions: the newest submissions, filtered. Zapier uses the first
// result (the newest match).
const findSubmissions = {
  key: 'find_submissions',
  noun: 'Submission',
  display: {
    label: 'Find Submissions',
    description:
      "Finds the newest submissions, optionally a template's, filtered by test or live and by date.",
  },
  operation: {
    inputFields: [
      {
        key: 'template_id',
        label: 'Template',
        type: 'string',
        required: false,
        dynamic: 'template_choices.id.label',
        helpText:
          "Only this template's submissions. Leave blank for every template.",
      },
      {
        key: 'test',
        label: 'Test or Live',
        type: 'string',
        required: false,
        choices: [
          { value: 'any', sample: 'any', label: 'Any' },
          { value: 'live', sample: 'live', label: 'Live only' },
          { value: 'test', sample: 'test', label: 'Test only' },
        ],
      },
      {
        key: 'created_after',
        label: 'Created After',
        type: 'datetime',
        required: false,
      },
      {
        key: 'created_before',
        label: 'Created Before',
        type: 'datetime',
        required: false,
      },
      {
        key: 'include_data',
        label: 'Include Data?',
        type: 'boolean',
        required: false,
        helpText: "Include each submission's data.",
      },
      {
        key: 'limit',
        label: 'Limit',
        type: 'integer',
        required: false,
        helpText: 'How many submissions to return, from 1 to 100. Default: 10.',
      },
    ],
    perform: async (z, bundle) => {
      const input = bundle.inputData || {}
      const templateId = text(input.template_id)
      const mode = text(input.test)
      const { items } = await listPage(
        z,
        templateId
          ? apiPath('templates', seg(templateId), 'submissions')
          : apiPath('submissions'),
        compact({
          test: mode === 'test' ? true : mode === 'live' ? false : undefined,
          created_after: text(input.created_after),
          created_before: text(input.created_before),
          include_data: toBoolean(z, input.include_data, 'Include Data?'),
          limit: toInteger(z, input.limit, 'Limit') || 10,
        })
      )
      return items
    },
    outputFields: submission.outputFields,
    sample: submission.sample,
  },
}

module.exports = {
  getSubmission,
  findSubmissions,
  getSubmissionBatch,
  getCombinedPdf,
  getSignatureRequest,
  getById,
}
