'use strict'

const { API_PREFIX, DATA_FIELD_PREFIX } = require('../lib/constants')
const { parseDict, unprefix } = require('../lib/util')
const { resolveSyncBaseUrl } = require('../lib/regions')
const {
  templateDropdown,
  controlFields,
  templateSchemaFields,
} = require('../lib/templates')
const {
  resourceCreateFields,
  resourceCreateSample,
} = require('../lib/resources')

const perform = async (z, bundle) => {
  const input = bundle.inputData || {}

  // Reassemble the `data` object from the namespaced template-field inputs.
  const data = {}
  Object.keys(input).forEach((key) => {
    if (!key.startsWith(DATA_FIELD_PREFIX)) return
    const value = input[key]
    if (value !== undefined && value !== null && value !== '') {
      data[unprefix(key)] = value
    }
  })

  const body = {
    data,
    test: input.test,
    metadata: parseDict(input.metadata),
    password: input.pdf_passphrase || undefined,
    editable: input.editable,
    expires_in: input.expires_in || undefined,
    version: input.version || undefined,
  }

  // Synchronous generation goes to the sync host so the finished PDF returns
  // well within Zapier's perform timeout. This is an absolute URL, so the
  // middleware leaves it unprefixed (but still attaches auth).
  const url = `${resolveSyncBaseUrl(bundle)}${API_PREFIX}/templates/${input.template_id}/submissions`

  const response = await z.request({
    url,
    method: 'POST',
    params: { wait: true },
    body,
    removeMissingValuesFrom: { body: true },
  })

  const result = response.data || {}
  if (result.status && result.status !== 'success') {
    const errors = (result.errors || []).join(', ') || 'unknown error'
    throw new z.errors.Error(
      `PDF generation failed: ${errors}`,
      'DocSpringApiError'
    )
  }
  return result.submission || result
}

module.exports = {
  key: 'generate_pdf',
  noun: 'PDF Submission',
  display: {
    label: 'Generate PDF',
    description:
      'Fill out a template and generate a PDF. Pick a template to reveal its fields.',
  },
  operation: {
    // Static fields render immediately; templateSchemaFields appends the
    // selected template's own fields (refreshed via altersDynamicFields).
    inputFields: [templateDropdown, ...controlFields, templateSchemaFields],
    perform,
    outputFields: resourceCreateFields('submission'),
    sample: resourceCreateSample('submission'),
  },
}
