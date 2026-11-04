'use strict'

const { apiPath, apiRequest } = require('../lib/api')
const { formatApiError } = require('../lib/errors')
const {
  compact,
  parseJson,
  seg,
  splitNames,
  text,
  toBoolean,
  toInteger,
} = require('../lib/util')
const {
  dataFromInputs,
  dataJsonInput,
  isMappedValue,
  fetchTemplateFields,
  signerFieldNames,
  jsonSchemaToZapierFields,
  templateDropdown,
  templateVersionInput,
  testInput,
  metadataInput,
} = require('../lib/templates')
const { testValue } = require('../lib/submissionInputs')
const { clock, fitsBudget, retryAfterMs } = require('../lib/wait')
const submission = require('../lib/resources/submission')
const signatureRequest = require('../lib/resources/signatureRequest')
const {
  emailMode,
  emailOptionFields,
  emailSettings,
  sendEmailInput,
  signingOrderInput,
} = require('../lib/signerEmails')

const MAX_SIGNERS = 10

// How your app authenticated the signer before showing them the signature
// request. `email_link` is the default, and the only one when DocSpring
// emails the signer.
const AUTH_TYPES = [
  { value: 'email_link', sample: 'email_link', label: 'Email link' },
  { value: 'password', sample: 'password', label: 'Password' },
  { value: 'oauth', sample: 'oauth', label: 'OAuth (set the provider)' },
  { value: 'phone_number', sample: 'phone_number', label: 'Phone number' },
  { value: 'ldap', sample: 'ldap', label: 'LDAP' },
  { value: 'saml', sample: 'saml', label: 'SAML' },
]

const LINK_TYPES = [
  { value: 'email', sample: 'email', label: 'Email link (opens for 7 days)' },
  {
    value: 'api',
    sample: 'api',
    label: 'Link to open now (opens for 24 hours)',
  },
  { value: 'none', sample: 'none', label: 'No link' },
]

function signerCount(z, input) {
  const count = toInteger(z, input.signer_count, 'Number of Signers') || 1
  if (count < 1 || count > MAX_SIGNERS) {
    throw new z.errors.Error(
      `Number of Signers must be from 1 to ${MAX_SIGNERS}.`,
      'InvalidInput',
      400
    )
  }
  return count
}

// The inputs for each signer. `fieldChoices` is the template's field names
// (when a template is chosen), for the Fields multi-select.
function signerFields(count, fieldChoices) {
  const fields = []
  for (let i = 1; i <= count; i++) {
    const p = `signer_${i}_`
    fields.push(
      {
        key: `${p}name`,
        label: `Signer ${i}: Name`,
        type: 'string',
        required: false,
      },
      {
        key: `${p}email`,
        label: `Signer ${i}: Email`,
        type: 'string',
        required: false,
        helpText: 'Required when DocSpring emails the signers.',
      },
      {
        key: `${p}fields`,
        label: `Signer ${i}: Fields`,
        type: 'string',
        list: true,
        required: true,
        ...(fieldChoices.length ? { choices: fieldChoices } : {}),
        helpText:
          'The fields this person fills in (signature fields included). Each field can only be in one signature request.',
      },
      {
        key: `${p}role`,
        label: `Signer ${i}: Role`,
        type: 'string',
        required: false,
        choices: Array.from(
          { length: MAX_SIGNERS },
          (_v, n) => `Signer ${n + 1}`
        ),
        helpText:
          "Which of the template's signers this is. Leave blank to go in order (the first signer is Signer 1). " +
          'Set it for every signer or for none.',
      },
      {
        key: `${p}auth_type`,
        label: `Signer ${i}: Authentication`,
        type: 'string',
        required: false,
        default: 'email_link',
        choices: AUTH_TYPES,
        helpText:
          'How the person is identified before they see the form. Choose Email link when they get their link by ' +
          "email, from DocSpring or from you: DocSpring's emails always use it. The other types are for people you " +
          'send the link to yourself or who sign in your app.',
      },
      {
        key: `${p}auth_provider`,
        label: `Signer ${i}: Authentication Provider`,
        type: 'string',
        required: false,
        helpText:
          'For OAuth: the service that signed them in, such as `google`.',
      },
      {
        key: `${p}signing_step`,
        label: `Signer ${i}: Signing Step`,
        type: 'integer',
        required: false,
        helpText:
          'With Signing Order One step at a time: when this person signs. Everyone in step 1 signs first, then ' +
          'step 2, and so on, and people in the same step sign in any order. Give every signer a step, or none to ' +
          'have them sign in the order of the signers.',
      },
      {
        key: `${p}prefilled_values_editable`,
        label: `Signer ${i}: Can Change Prefilled Values?`,
        type: 'boolean',
        required: false,
        helpText:
          'Let this person change the values you prefill for their fields. Needed to prefill one of their fields.',
      },
      {
        key: `${p}ignore_unknown_fields`,
        label: `Signer ${i}: Ignore Unknown Fields?`,
        type: 'boolean',
        required: false,
        helpText:
          "Leave out field names the template doesn't have, instead of failing.",
      }
    )
  }
  return fields
}

const signingLinkTypeInput = {
  key: 'signing_link_type',
  label: 'Signing Link',
  type: 'string',
  required: false,
  default: 'email',
  choices: LINK_TYPES,
  helpText:
    'A link for each signer to open their signature request, for a later step to send. ' +
    'An email link opens it for 7 days; a link to open now, for 24 hours.',
}

// The inputs that go with Emails to Signers: DocSpring's email options, or the
// signing link type when you send the links.
function emailModeFields(z, input) {
  let mode = 'docspring'
  try {
    mode = emailMode(z, input)
  } catch (_e) {
    // An invalid choice is reported by perform; show DocSpring's options meanwhile.
  }
  return mode === 'self' ? [signingLinkTypeInput] : emailOptionFields
}

// Dynamic inputs: the email options or link type, each signer's inputs, then
// the template's fields to prefill (all optional, without signature and
// initials fields: only signers sign).
async function dynamicFields(z, bundle) {
  const input = bundle.inputData || {}
  let count = 1
  try {
    count = signerCount(z, input)
  } catch (_e) {
    // An invalid count is reported by perform; show one signer meanwhile.
  }
  const modeFields = emailModeFields(z, input)
  if (!text(input.template_id) || isMappedValue(input.template_id)) {
    return modeFields.concat(signerFields(count, []))
  }

  // The submission uses the latest published version when Template Version is
  // blank, so the field names must come from it too (the field list's own
  // default is the draft).
  const [templateFields, schemaResponse] = await Promise.all([
    fetchTemplateFields(z, input.template_id, text(input.version) || 'latest'),
    apiRequest(z, {
      url: apiPath('templates', seg(input.template_id), 'schema'),
      params: compact({ version: text(input.version) }),
    }),
  ])
  const names = signerFieldNames(templateFields)
  const prefill = jsonSchemaToZapierFields(schemaResponse.data, {
    optional: true,
    skipSignatures: true,
  }).map((field) => ({ ...field, label: `Prefill: ${field.label}` }))
  return modeFields.concat(signerFields(count, names), prefill)
}

function signatureRequestsFromInputs(z, input) {
  const requests = []
  for (let i = 1; i <= signerCount(z, input); i++) {
    const p = `signer_${i}_`
    const fields = splitNames(input[`${p}fields`])
    if (fields.length === 0) {
      throw new z.errors.Error(
        `Signer ${i} needs at least one field.`,
        'InvalidInput',
        400
      )
    }
    const authType = text(input[`${p}auth_type`]) || 'email_link'
    const authProvider = text(input[`${p}auth_provider`])
    if (authType === 'oauth' && !authProvider) {
      throw new z.errors.Error(
        `Signer ${i} uses OAuth, so it needs an Authentication Provider (such as google).`,
        'InvalidInput',
        400
      )
    }
    requests.push(
      compact({
        name: text(input[`${p}name`]),
        email: text(input[`${p}email`]),
        role: text(input[`${p}role`]),
        fields,
        signing_step: toInteger(
          z,
          input[`${p}signing_step`],
          `Signer ${i}: Signing Step`
        ),
        auth_type: authType,
        auth_provider: authProvider,
        prefilled_values_editable: toBoolean(
          z,
          input[`${p}prefilled_values_editable`],
          `Signer ${i}: Can Change Prefilled Values?`
        ),
        ignore_unknown_fields: toBoolean(
          z,
          input[`${p}ignore_unknown_fields`],
          `Signer ${i}: Ignore Unknown Fields?`
        ),
      })
    )
  }
  return requests
}

// The error when the submission and its signature requests exist but some
// signing links weren't made: running the step again would create them all
// again, so it says to make the missing links with Create Signing Link.
function signingLinksFailed(z, created, missing, reason, status) {
  const ids = missing.map((request) => request.id).join(', ')
  const one = missing.length === 1
  return new z.errors.Error(
    [
      `The signature requests were created, but the signing ${one ? 'link' : 'links'} for ${ids} couldn't be made. ` +
        `Make ${one ? 'it' : 'them'} with Create Signing Link instead of running this step again.`,
      reason,
      `Submission: ${created.id}`,
    ].join('\n'),
    'SigningLinkFailed',
    status
  )
}

// Create a signing link (a token) for each signature request, within the
// step's time budget (from `startedAt`), when you send the links. DocSpring's
// emails have their own links, so a link here would send the signer a second
// one: with DocSpring's emails, or a link type of none, each `signing_url` is
// null. A rate-limited request (429) waits for Retry-After when that fits the
// time left. Any failure is the error above, never the platform's
// ThrottledError, which makes Zapier retry the step.
async function withSigningLinks(z, created, linkType, startedAt) {
  const requests = created.signature_requests || []
  const enriched = []
  for (const [index, request] of requests.entries()) {
    if (linkType === 'none') {
      enriched.push({ ...request, signing_url: null })
      continue
    }
    const missing = requests.slice(index)
    let response
    for (;;) {
      if (!fitsBudget(startedAt, 0)) {
        throw signingLinksFailed(
          z,
          created,
          missing,
          "There wasn't time to make them within Zapier's time limit.",
          504
        )
      }
      try {
        response = await apiRequest(z, {
          url: apiPath('signature_requests', seg(request.id), 'tokens'),
          method: 'POST',
          body: { type: linkType },
          skipThrowForStatus: true,
          throwForThrottlingEarly: false,
        })
      } catch (e) {
        throw signingLinksFailed(z, created, missing, e.message, 502)
      }
      if (response.status !== 429) break
      const retryAfter = retryAfterMs(response)
      if (retryAfter === undefined || !fitsBudget(startedAt, retryAfter)) break
      await clock.sleep(retryAfter)
    }
    if (response.status >= 400) {
      throw signingLinksFailed(
        z,
        created,
        missing,
        formatApiError(response),
        response.status
      )
    }
    enriched.push({
      ...request,
      signing_url: response.data.signature_request_url,
    })
  }
  return enriched
}

const perform = async (z, bundle) => {
  const startedAt = clock.now()
  const input = bundle.inputData || {}
  const settings = emailSettings(z, input)
  const linkType = settings.send_email
    ? 'none'
    : text(input.signing_link_type) || 'email'
  if (!LINK_TYPES.some((type) => type.value === linkType)) {
    throw new z.errors.Error(
      `Signing Link must be email, api or none, not "${linkType}".`,
      'InvalidInput',
      400
    )
  }
  const body = compact({
    data: dataFromInputs(z, input),
    test: testValue(z, input.test),
    metadata: parseJson(z, input.metadata, 'Metadata'),
    signature_requests: signatureRequestsFromInputs(z, input),
    ...settings,
  })

  // A submission with signature requests returns straight away, waiting for
  // its signers, so this goes to the standard host and doesn't wait.
  const response = await apiRequest(z, {
    url: apiPath('templates', seg(input.template_id), 'submissions'),
    method: 'POST',
    params: compact({ version: text(input.version) }),
    body,
  })
  const created = response.data
  const requests = await withSigningLinks(z, created, linkType, startedAt)
  const first = requests[0] || {}
  return {
    ...created,
    signature_requests: requests,
    first_signature_request_id: first.id || null,
    first_signing_url: first.signing_url || null,
  }
}

const SIGNING_URL =
  'https://app.docspring.com/signature_requests/srq_1234567890abcdef01?token_id=tok_1234567890abcdef01&token_secret=abcdef1234567890'

// A request whose links you send yourself, so the signing link fields have a
// value to map. With DocSpring's emails, each `signing_url` is null.
const sample = {
  ...submission.sample,
  state: 'waiting_for_signature_requests',
  data: { company_name: 'Acme' },
  files: {},
  processed_at: null,
  signature_requests: [
    {
      ...signatureRequest.sample,
      state: 'pending',
      data: null,
      viewed_at: null,
      completed_at: null,
      ip_address: null,
      user_agent: null,
      send_email: false,
      sent_at: null,
      email_status: null,
      signing_url: SIGNING_URL,
    },
  ],
  first_signature_request_id: 'srq_1234567890abcdef01',
  first_signing_url: SIGNING_URL,
}

module.exports = {
  key: 'create_signature_request',
  noun: 'Signature Request',
  display: {
    label: 'Create Signature Request',
    description:
      'Asks one or more people to fill in and sign a template. DocSpring emails each of them a link to sign, or returns a signing link for each of them to send yourself.',
  },
  operation: {
    inputFields: [
      templateDropdown,
      templateVersionInput,
      {
        ...testInput,
        label: 'Test?',
        helpText:
          'Test PDFs are free and have a watermark. A test API token always makes test PDFs.',
      },
      metadataInput,
      sendEmailInput,
      signingOrderInput,
      {
        key: 'signer_count',
        label: 'Number of Signers',
        type: 'string',
        required: true,
        default: '1',
        altersDynamicFields: true,
        choices: Array.from({ length: MAX_SIGNERS }, (_v, n) => String(n + 1)),
      },
      dataJsonInput({
        label: 'Prefill: Data (JSON)',
        helpText:
          'Values to prefill as a JSON object, such as `{"company": "Acme"}`. ' +
          "Use it when the template comes from an earlier step, so its fields aren't listed here. " +
          'A Prefill field with a value wins over the same name here.',
      }),
      dynamicFields,
    ],
    perform,
    outputFields: submission.outputFields.concat([
      {
        key: 'first_signature_request_id',
        label: 'First Signature Request ID',
        type: 'string',
      },
      { key: 'first_signing_url', label: 'First Signing Link', type: 'string' },
      {
        key: 'signature_requests[]id',
        label: 'Signature Request IDs',
        type: 'string',
      },
      {
        key: 'signature_requests[]email',
        label: 'Signature Request Emails',
        type: 'string',
      },
      {
        key: 'signature_requests[]role',
        label: 'Signature Request Roles',
        type: 'string',
      },
      {
        key: 'signature_requests[]state',
        label: 'Signature Request States',
        type: 'string',
      },
      {
        key: 'signature_requests[]send_email',
        label: 'Signature Requests Emailed by DocSpring',
        type: 'boolean',
      },
      {
        key: 'signature_requests[]signing_step',
        label: 'Signature Request Signing Steps',
        type: 'integer',
      },
      {
        key: 'signature_requests[]sent_at',
        label: 'Signature Request Emails Sent At',
        type: 'datetime',
      },
      {
        key: 'signature_requests[]email_status',
        label: 'Signature Request Email Statuses',
        type: 'string',
      },
      {
        key: 'signature_requests[]signing_url',
        label: 'Signing Links',
        type: 'string',
      },
    ]),
    sample,
  },
}
