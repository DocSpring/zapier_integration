'use strict'

const { API_PREFIX, DATA_FIELD_PREFIX } = require('../lib/constants')
const { parseDict, unprefix } = require('../lib/util')
const {
  templateDropdown,
  controlFields,
  templateSchemaFieldsOptional,
} = require('../lib/templates')
const {
  resourceCreateFields,
  resourceCreateSample,
} = require('../lib/resources')

// Authentication methods DocSpring supports for a data request. `email_link` is
// the default because it lets DocSpring hand back an authenticated signing link
// (30-day `email` token) that the Zap can send straight to the recipient.
const AUTH_TYPES = [
  {
    value: 'email_link',
    sample: 'email_link',
    label: 'Email link (recommended)',
  },
  { value: 'password', sample: 'password', label: 'Password' },
  { value: 'oauth', sample: 'oauth', label: 'OAuth' },
  { value: 'phone_number', sample: 'phone_number', label: 'Phone number' },
  { value: 'ldap', sample: 'ldap', label: 'LDAP' },
  { value: 'saml', sample: 'saml', label: 'SAML' },
  { value: 'none', sample: 'none', label: 'None (demos only)' },
]

// Split a comma/newline-separated list of field names into a clean array.
function parseFields(value) {
  if (value == null || value === '') return undefined
  const arr = (Array.isArray(value) ? value : String(value).split(/[\n,]/))
    .map((s) => String(s).trim())
    .filter(Boolean)
  return arr.length ? arr : undefined
}

const perform = async (z, bundle) => {
  const input = bundle.inputData || {}

  // Any fields the sender pre-fills. All optional here — recipients complete
  // whatever is left blank. `data` is always sent (the API requires the key,
  // even as an empty object).
  const data = {}
  Object.keys(input).forEach((key) => {
    if (!key.startsWith(DATA_FIELD_PREFIX)) return
    const value = input[key]
    if (value !== undefined && value !== null && value !== '') {
      data[unprefix(key)] = value
    }
  })

  const rows = (input.data_requests || []).filter((r) => r && r.email)
  if (rows.length === 0) {
    throw new z.errors.Error(
      'Add at least one recipient email to send a data request to.',
      'InvalidData'
    )
  }
  const dataRequests = rows.map((r) => ({
    email: r.email,
    name: r.name || undefined,
    fields: parseFields(r.fields),
    auth_type: r.auth_type || 'email_link',
  }))

  // Data-request submissions do NOT wait for a PDF — they return immediately in
  // `waiting_for_data_requests` state and finish only once every recipient has
  // completed their part. So this posts to the standard host (no `?wait=true`,
  // no sync host, unlike Generate PDF). `data` is kept even when empty, so we
  // don't lean on removeMissingValuesFrom (which would drop an empty object).
  const body = {
    data,
    data_requests: dataRequests,
    test: input.test,
    metadata: parseDict(input.metadata),
    editable: input.editable,
    expires_in: input.expires_in || undefined,
    version: input.version || undefined,
    password: input.pdf_passphrase || undefined,
  }

  const response = await z.request({
    url: `${API_PREFIX}/templates/${input.template_id}/submissions`,
    method: 'POST',
    body,
  })

  const result = response.data || {}
  if (result.status && result.status !== 'success') {
    const errors = (result.errors || []).join(', ') || 'unknown error'
    throw new z.errors.Error(
      `Could not create data request: ${errors}`,
      'DocSpringApiError'
    )
  }

  const submission = result.submission || result
  const created = submission.data_requests || []

  // Mint a 30-day authenticated signing link per recipient so the next Zap step
  // (e.g. Send Email) can share it. One link failing shouldn't fail the whole
  // action — leave signing_url null for that recipient and carry on.
  const enriched = []
  for (const dr of created) {
    let signingUrl = null
    if (dr.id && dr.state !== 'completed') {
      try {
        const tok = await z.request({
          url: `${API_PREFIX}/data_requests/${dr.id}/tokens`,
          method: 'POST',
          body: { type: 'email' },
        })
        const tdata = tok.data || {}
        signingUrl = (tdata.token && tdata.token.data_request_url) || null
      } catch (_e) {
        signingUrl = null
      }
    }
    enriched.push(Object.assign({}, dr, { signing_url: signingUrl }))
  }

  const first = enriched[0] || {}
  return Object.assign({}, submission, {
    data_requests: enriched,
    first_data_request_id: first.id || null,
    first_signing_url: first.signing_url || null,
  })
}

// Sample: a submission awaiting one recipient, with the minted signing link.
const dataRequestSample = () => {
  const base = resourceCreateSample('submission')
  const dr = {
    id: 'drq_000000000000000001',
    email: 'jane@example.com',
    name: 'Jane Doe',
    order: 0,
    fields: ['first_name', 'signature'],
    state: 'pending',
    viewed_at: null,
    completed_at: null,
    signing_url:
      'https://api.docspring.com/data_requests/drq_000000000000000001?token_id=tok_000000000000000001&token_secret=secret',
  }
  return Object.assign({}, base, {
    state: 'waiting_for_data_requests',
    processed_at: null,
    download_url: null,
    permanent_download_url: null,
    data_requests: [dr],
    first_data_request_id: dr.id,
    first_signing_url: dr.signing_url,
  })
}

module.exports = {
  key: 'create_data_request',
  noun: 'Data Request',
  display: {
    label: 'Create Data Request',
    description:
      'Create a PDF submission with pending data requests, so one or more people can fill it out or sign it. Returns an authenticated signing link for each recipient.',
  },
  operation: {
    // Template dropdown + recipients render immediately; the selected template's
    // (optional) pre-fill fields are appended by templateSchemaFieldsOptional.
    inputFields: [
      templateDropdown,
      {
        key: 'data_requests',
        label: 'Recipients',
        required: true,
        children: [
          {
            key: 'email',
            label: 'Email',
            type: 'string',
            required: true,
            helpText: 'The person who should fill out or sign this request.',
          },
          { key: 'name', label: 'Name', type: 'string', required: false },
          {
            key: 'fields',
            label: 'Fields',
            type: 'string',
            required: false,
            helpText:
              'Comma-separated template field names this person must complete. ' +
              'Leave blank with a single recipient to let them fill everything. ' +
              'Required when there is more than one recipient.',
          },
          {
            key: 'auth_type',
            label: 'Authentication',
            type: 'string',
            required: false,
            default: 'email_link',
            choices: AUTH_TYPES,
            helpText:
              '"Email link" returns an authenticated signing link you can email to the recipient.',
          },
        ],
      },
      ...controlFields,
      templateSchemaFieldsOptional,
    ],
    perform,
    // Scalar submission fields + the two convenience fields. The per-recipient
    // `data_requests` array (with signing_url) is in the sample so it maps,
    // without declaring an object output field (which would trip check D024).
    outputFields: resourceCreateFields('submission').concat([
      {
        key: 'first_data_request_id',
        label: 'First Data Request ID',
        type: 'string',
      },
      { key: 'first_signing_url', label: 'First Signing URL', type: 'string' },
    ]),
    sample: dataRequestSample(),
  },
}
