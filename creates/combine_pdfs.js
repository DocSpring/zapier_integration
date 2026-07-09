'use strict'

const { API_PREFIX } = require('../lib/constants')
const { parseDict } = require('../lib/util')
const { resolveSyncBaseUrl } = require('../lib/regions')
const {
  resourceCreateFields,
  resourceCreateSample,
} = require('../lib/resources')

const perform = async (z, bundle) => {
  const input = bundle.inputData || {}

  const sourcePdfs = (input.source_pdfs || [])
    .filter((row) => row && row.id)
    .map((row) => {
      const entry = { type: row.type || 'submission', id: row.id }
      if (row.template_version) entry.template_version = row.template_version
      return entry
    })

  const body = {
    source_pdfs: sourcePdfs,
    metadata: parseDict(input.metadata),
    password: input.pdf_passphrase || undefined,
    expires_in: input.expires_in || undefined,
  }

  // The sync host waits for processing (like Generate PDF), so this returns
  // the finished combined PDF. On the standard host the request would return
  // a still-pending combined submission instead.
  const response = await z.request({
    url: `${resolveSyncBaseUrl(bundle)}${API_PREFIX}/combined_submissions`,
    method: 'POST',
    params: { wait: true },
    body,
    removeMissingValuesFrom: { body: true },
  })

  const result = response.data || {}
  if (result.status && result.status !== 'success') {
    const errors = (result.errors || []).join(', ') || 'unknown error'
    throw new z.errors.Error(
      `Combine PDFs failed: ${errors}`,
      'DocSpringApiError'
    )
  }
  return result.combined_submission || result
}

module.exports = {
  key: 'combine_pdfs',
  noun: 'Combined PDF',
  display: {
    label: 'Combine PDFs',
    description:
      'Merge multiple submissions, templates, or files into a single PDF.',
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
            default: 'submission',
            choices: [
              {
                value: 'submission',
                sample: 'submission',
                label: 'Submission',
              },
              { value: 'template', sample: 'template', label: 'Template' },
              {
                value: 'custom_file',
                sample: 'custom_file',
                label: 'Custom File',
              },
            ],
          },
          {
            key: 'id',
            label: 'ID',
            type: 'string',
            helpText:
              'The submission (sub_), template (tpl_), or custom file (cfi_) ID.',
          },
          {
            key: 'template_version',
            label: 'Template Version',
            type: 'string',
            required: false,
          },
        ],
      },
      { key: 'metadata', label: 'Metadata', dict: true, required: false },
      {
        key: 'pdf_passphrase',
        label: 'Encrypt PDF With Passphrase',
        type: 'string',
        required: false,
        helpText: 'Password used to encrypt and open the combined PDF.',
      },
      {
        key: 'expires_in',
        label: 'Expires In (seconds)',
        type: 'integer',
        required: false,
      },
    ],
    perform,
    outputFields: resourceCreateFields('combined_submission'),
    sample: resourceCreateSample('combined_submission'),
  },
}
