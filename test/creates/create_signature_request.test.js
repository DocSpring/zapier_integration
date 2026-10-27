'use strict'

const nock = require('nock')
const {
  App,
  appTester,
  authData,
  API,
  apiError,
  errorFrom,
  fakeClock,
} = require('../helpers')

const op = App.creates.create_signature_request.operation
const dynamicFields = op.inputFields[op.inputFields.length - 1]

const created = {
  id: 'sub_1',
  state: 'waiting_for_signature_requests',
  signature_requests: [
    { id: 'srq_1', email: 'jane@example.com', state: 'pending', sort_order: 0 },
    { id: 'srq_2', email: 'john@example.com', state: 'pending', sort_order: 1 },
  ],
}
const tokenFor = (id) => ({
  id: `tok_${id}`,
  signature_request_id: id,
  type: 'email',
  signature_request_url: `https://app.docspring.com/signature_requests/${id}?token_id=tok_${id}&token_secret=s`,
})

describe('create_signature_request', () => {
  it("shows each signer's inputs with the template's field names, then optional prefill fields without signatures", async () => {
    nock(API)
      .get('/api/v2/templates/tpl_1/fields')
      .query({ version: '2' })
      .reply(200, {
        template_id: 'tpl_1',
        version: '2.0.0',
        fields: [
          { id: 1, name: 'first_name', static: false },
          { id: 2, name: 'signature', static: false },
          { id: 3, name: 'first_name', static: false },
          { id: 4, name: 'Heading', static: true },
        ],
      })
      .get('/api/v2/templates/tpl_1/schema')
      .query({ version: '2' })
      .reply(200, {
        properties: {
          first_name: { type: 'string' },
          signature: {
            'x-input-type': 'signature',
            oneOf: [{ properties: { url: {} } }],
          },
        },
        required: ['first_name', 'signature'],
      })

    const fields = await appTester(dynamicFields, {
      authData,
      inputData: { template_id: 'tpl_1', version: '2', signer_count: '2' },
    })
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f]))
    expect(byKey.signer_1_fields).toMatchObject({
      list: true,
      required: true,
      choices: ['first_name', 'signature'],
    })
    expect(byKey.signer_2_email).toBeDefined()
    expect(byKey.signer_3_email).toBeUndefined()
    expect(byKey.signer_1_auth_type.default).toBe('email_link')
    expect(byKey.signer_1_auth_type.choices.map((c) => c.value)).not.toContain(
      'none'
    )
    // Prefill fields are optional, and only signers fill in signature fields.
    expect(byKey.data__first_name).toMatchObject({
      required: false,
      label: 'Prefill: First Name',
    })
    expect(byKey.data_image__signature).toBeUndefined()
  })

  // A blank Template Version means the latest published version for the
  // submission (and the schema), but the field list defaults to the draft.
  it("offers the latest published version's field names when no version is chosen", async () => {
    const scope = nock(API)
      .get('/api/v2/templates/tpl_1/fields')
      .query({ version: 'latest' })
      .reply(200, {
        template_id: 'tpl_1',
        version: '1.0.0',
        fields: [
          { id: 1, name: 'signature', static: false, type: 'signature' },
          { id: 2, name: 'full_name', static: false, type: 'combined' },
          { id: 3, name: '@@submission_id', static: false, type: 'string' },
          { id: 4, name: 'date', static: false, type: 'date' },
          { id: 5, name: 'signature', static: false, type: 'signature' },
        ],
      })
      .get('/api/v2/templates/tpl_1/schema')
      .reply(200, { properties: {} })

    const fields = await appTester(dynamicFields, {
      authData,
      inputData: { template_id: 'tpl_1', version: '', signer_count: '1' },
    })
    expect(scope.isDone()).toBe(true)
    // Each name once, in the API's order, without fields that take no value.
    expect(fields.find((f) => f.key === 'signer_1_fields').choices).toEqual([
      'signature',
      'date',
    ])
  })

  it('shows only the signer inputs for a template mapped from an earlier step, and prefills from Data (JSON)', async () => {
    const fields = await appTester(dynamicFields, {
      authData,
      inputData: { template_id: '{{123__id}}', signer_count: '1' },
    })
    expect(fields.find((f) => f.key === 'signer_1_fields')).not.toHaveProperty(
      'choices'
    )
    expect(fields.some((f) => f.key.startsWith('data'))).toBe(false)

    let body
    nock(API)
      .post('/api/v2/templates/tpl_9/submissions', (b) => {
        body = b
        return true
      })
      .reply(201, { ...created, signature_requests: [] })
    await appTester(op.perform, {
      authData,
      inputData: {
        template_id: 'tpl_9',
        json_data: '{"company": "Acme"}',
        signer_1_fields: ['signature'],
      },
    })
    expect(body.data).toEqual({ company: 'Acme' })
  })

  it('creates the submission with signature_requests on the standard host, then a signing link for each', async () => {
    let body
    const scope = nock(API)
      .post('/api/v2/templates/tpl_1/submissions', (b) => {
        body = b
        return true
      })
      .query({ version: 'draft' })
      .reply(201, created)
      .post('/api/v2/signature_requests/srq_1/tokens', { type: 'email' })
      .reply(201, tokenFor('srq_1'))
      .post('/api/v2/signature_requests/srq_2/tokens', { type: 'email' })
      .reply(201, tokenFor('srq_2'))

    const result = await appTester(op.perform, {
      authData,
      inputData: {
        template_id: 'tpl_1',
        version: 'draft',
        test: 'true',
        data__company: 'Acme',
        signer_count: '2',
        signer_1_name: 'Jane Doe',
        signer_1_email: 'jane@example.com',
        signer_1_fields: ['first_name', 'signature'],
        signer_1_prefilled_values_editable: 'false',
        signer_2_email: 'john@example.com',
        signer_2_fields: ['date, initials'],
        signer_2_auth_type: 'oauth',
        signer_2_auth_provider: 'google',
        signer_2_ignore_unknown_fields: 'true',
      },
    })

    expect(scope.isDone()).toBe(true)
    expect(body).toEqual({
      data: { company: 'Acme' },
      test: true,
      signature_requests: [
        {
          name: 'Jane Doe',
          email: 'jane@example.com',
          fields: ['first_name', 'signature'],
          auth_type: 'email_link',
          prefilled_values_editable: false,
        },
        {
          email: 'john@example.com',
          fields: ['date', 'initials'],
          auth_type: 'oauth',
          auth_provider: 'google',
          ignore_unknown_fields: true,
        },
      ],
    })
    expect(body).not.toHaveProperty('editable')
    expect(result.state).toBe('waiting_for_signature_requests')
    expect(result.first_signature_request_id).toBe('srq_1')
    expect(result.first_signing_url).toBe(
      tokenFor('srq_1').signature_request_url
    )
    expect(result.signature_requests.map((r) => r.signing_url)).toEqual([
      tokenFor('srq_1').signature_request_url,
      tokenFor('srq_2').signature_request_url,
    ])
  })

  it('makes 24-hour api links, or none', async () => {
    nock(API)
      .post('/api/v2/templates/tpl_1/submissions')
      .reply(201, {
        ...created,
        signature_requests: [created.signature_requests[0]],
      })
      .post('/api/v2/signature_requests/srq_1/tokens', { type: 'api' })
      .reply(201, { ...tokenFor('srq_1'), type: 'api' })
    const withApi = await appTester(op.perform, {
      authData,
      inputData: {
        template_id: 'tpl_1',
        signing_link_type: 'api',
        signer_1_fields: ['a'],
      },
    })
    expect(withApi.first_signing_url).toBe(
      tokenFor('srq_1').signature_request_url
    )

    nock(API).post('/api/v2/templates/tpl_1/submissions').reply(201, created)
    const none = await appTester(op.perform, {
      authData,
      inputData: {
        template_id: 'tpl_1',
        signing_link_type: 'none',
        signer_1_fields: ['a'],
      },
    })
    expect(none.first_signature_request_id).toBe('srq_1')
    expect(none.first_signing_url).toBeNull()
    expect(none.signature_requests[0].signing_url).toBeNull()
  })

  it('needs fields for every signer, and a provider for OAuth, before sending anything', async () => {
    const noFields = await errorFrom(
      appTester(op.perform, {
        authData,
        inputData: { template_id: 'tpl_1', signer_1_email: 'a@x.com' },
      })
    )
    expect(noFields.message).toBe('Signer 1 needs at least one field.')

    const noProvider = await errorFrom(
      appTester(op.perform, {
        authData,
        inputData: {
          template_id: 'tpl_1',
          signer_1_fields: ['a'],
          signer_1_auth_type: 'oauth',
        },
      })
    )
    expect(noProvider.message).toMatch(
      /Signer 1 uses OAuth, so it needs an Authentication Provider/
    )
  })

  it('says the requests exist when a signing link fails, so the step is not run again', async () => {
    nock(API)
      .post('/api/v2/templates/tpl_1/submissions')
      .reply(201, {
        ...created,
        signature_requests: [created.signature_requests[0]],
      })
      .post('/api/v2/signature_requests/srq_1/tokens')
      .reply(500, apiError('internal_error', 'Something went wrong'))
    const error = await errorFrom(
      appTester(op.perform, {
        authData,
        inputData: { template_id: 'tpl_1', signer_1_fields: ['a'] },
      })
    )
    expect(error.message).toMatch(
      /^The signature requests were created, but the signing link for srq_1 couldn't be made\. Make it with Create Signing Link instead of running this step again\./
    )
    expect(error.message).toMatch(
      /DocSpring API error 500 internal_error: Something went wrong/
    )
    expect(error.message).toMatch(/Submission: sub_1/)
  })

  // Zapier retries a step that ends in its ThrottledError, and this step has
  // already created the submission: a retry would make a second one.
  it('waits for Retry-After when a signing link is rate limited and there is time', async () => {
    const clock = fakeClock()
    nock(API)
      .post('/api/v2/templates/tpl_1/submissions')
      .reply(201, created)
      .post('/api/v2/signature_requests/srq_1/tokens')
      .reply(201, tokenFor('srq_1'))
      .post('/api/v2/signature_requests/srq_2/tokens')
      .reply(429, apiError('rate_limited', 'Too many requests'), {
        'Retry-After': '12',
      })
      .post('/api/v2/signature_requests/srq_2/tokens')
      .reply(201, tokenFor('srq_2'))

    const result = await appTester(op.perform, {
      authData,
      inputData: {
        template_id: 'tpl_1',
        signer_count: '2',
        signer_1_fields: ['a'],
        signer_2_fields: ['b'],
      },
    })
    expect(clock.sleeps).toEqual([12000])
    expect(result.signature_requests.map((r) => r.signing_url)).toEqual([
      tokenFor('srq_1').signature_request_url,
      tokenFor('srq_2').signature_request_url,
    ])
  })

  it('says the requests exist, naming every link not made, when a rate limit outlasts the time left', async () => {
    const clock = fakeClock()
    nock(API)
      .post('/api/v2/templates/tpl_1/submissions')
      // The time spent creating the submission counts too.
      .reply(() => {
        clock.now += 15000
        return [
          201,
          {
            ...created,
            signature_requests: [
              ...created.signature_requests,
              { id: 'srq_3', state: 'pending', sort_order: 2 },
            ],
          },
        ]
      })
      .post('/api/v2/signature_requests/srq_1/tokens')
      .reply(201, tokenFor('srq_1'))
      .post('/api/v2/signature_requests/srq_2/tokens')
      .reply(429, apiError('rate_limited', 'Too many requests'), {
        'Retry-After': '12',
      })

    const error = await errorFrom(
      appTester(op.perform, {
        authData,
        inputData: {
          template_id: 'tpl_1',
          signer_count: '3',
          signer_1_fields: ['a'],
          signer_2_fields: ['b'],
          signer_3_fields: ['c'],
        },
      })
    )
    expect(error.code).toBe('SigningLinkFailed')
    expect(error.message).toBe(
      [
        "The signature requests were created, but the signing links for srq_2, srq_3 couldn't be made. " +
          'Make them with Create Signing Link instead of running this step again.',
        'DocSpring API error 429 rate_limited: Too many requests',
        'Request ID: req_1234567890abcdef01',
        'Submission: sub_1',
      ].join('\n')
    )
    expect(clock.sleeps).toEqual([])
  })

  it('says the requests exist when a signing link request fails without a response', async () => {
    nock(API)
      .post('/api/v2/templates/tpl_1/submissions')
      .reply(201, created)
      .post('/api/v2/signature_requests/srq_1/tokens')
      .replyWithError('socket hang up')
    const error = await errorFrom(
      appTester(op.perform, {
        authData,
        inputData: { template_id: 'tpl_1', signer_1_fields: ['a'] },
      })
    )
    expect(error.message).toMatch(
      /^The signature requests were created, but the signing links for srq_1, srq_2 couldn't be made\./
    )
    expect(error.message).toMatch(/socket hang up/)
    expect(error.message).toMatch(/Submission: sub_1$/)
  })

  it('stops before a signing link request that could run past the time limit', async () => {
    const clock = fakeClock()
    nock(API)
      .post('/api/v2/templates/tpl_1/submissions')
      .reply(() => {
        clock.now += 26000
        return [201, created]
      })
    // No token request is mocked: one would fail with a network error.
    const error = await errorFrom(
      appTester(op.perform, {
        authData,
        inputData: { template_id: 'tpl_1', signer_1_fields: ['a'] },
      })
    )
    expect(error.message).toBe(
      [
        "The signature requests were created, but the signing links for srq_1, srq_2 couldn't be made. " +
          'Make them with Create Signing Link instead of running this step again.',
        "There wasn't time to make them within Zapier's time limit.",
        'Submission: sub_1',
      ].join('\n')
    )
  })
})
