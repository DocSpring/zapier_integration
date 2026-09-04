'use strict'

const nock = require('nock')
const zapier = require('zapier-platform-core')
const App = require('../../index')

const appTester = zapier.createAppTester(App)
const authData = {
  region: 'us',
  token_id: 'api_test_abc',
  token_secret: 'sekret',
}
const op = App.creates.create_data_request.operation

describe('create_data_request create', () => {
  afterEach(() => nock.cleanAll())

  it('renders the template pre-fill fields as OPTIONAL', async () => {
    nock('https://api.docspring.com')
      .get('/api/v1/templates/tpl_1/schema')
      .reply(200, {
        properties: { first_name: { type: 'string' } },
        required: ['first_name'],
      })

    const dynamicFn = op.inputFields[op.inputFields.length - 1]
    const fields = await appTester(dynamicFn, {
      authData,
      inputData: { template_id: 'tpl_1' },
    })
    const field = fields.find((f) => f.key === 'data__first_name')
    expect(field).toBeDefined()
    // A schema-required field must NOT be required here (the recipient fills it).
    expect(field.required).toBe(false)
  })

  it('posts to the STANDARD host without wait, then mints a signing link per recipient', async () => {
    let capturedBody
    const scope = nock('https://api.docspring.com')
      .post('/api/v1/templates/tpl_1/submissions', (body) => {
        capturedBody = body
        return true
      })
      .reply(201, {
        status: 'success',
        submission: {
          id: 'sub_1',
          state: 'waiting_for_data_requests',
          data_requests: [
            { id: 'drq_1', email: 'jane@example.com', state: 'pending' },
          ],
        },
      })
      .post('/api/v1/data_requests/drq_1/tokens', (body) => body.type === 'email')
      .reply(201, {
        status: 'success',
        token: {
          id: 'tok_1',
          data_request_url: 'https://api.docspring.com/data_requests/drq_1?token_id=tok_1&token_secret=s',
        },
      })

    const bundle = {
      authData,
      inputData: {
        template_id: 'tpl_1',
        data__first_name: 'Jane',
        data_requests: [{ email: 'jane@example.com', name: 'Jane Doe' }],
      },
    }
    const result = await appTester(op.perform, bundle)

    // Standard host (no sync host was contacted) + no ?wait=true.
    expect(scope.isDone()).toBe(true)
    expect(capturedBody.data).toEqual({ first_name: 'Jane' })
    expect(capturedBody.data_requests).toEqual([
      { email: 'jane@example.com', name: 'Jane Doe', auth_type: 'email_link' },
    ])

    expect(result.id).toBe('sub_1')
    expect(result.state).toBe('waiting_for_data_requests')
    expect(result.first_data_request_id).toBe('drq_1')
    expect(result.first_signing_url).toBe(
      'https://api.docspring.com/data_requests/drq_1?token_id=tok_1&token_secret=s'
    )
    expect(result.data_requests[0].signing_url).toBe(result.first_signing_url)
  })

  it('splits comma-separated fields and defaults auth_type to email_link', async () => {
    let capturedBody
    nock('https://api.docspring.com')
      .post('/api/v1/templates/tpl_1/submissions', (body) => {
        capturedBody = body
        return true
      })
      .reply(201, {
        status: 'success',
        submission: { id: 'sub_2', state: 'waiting_for_data_requests', data_requests: [] },
      })

    await appTester(op.perform, {
      authData,
      inputData: {
        template_id: 'tpl_1',
        data_requests: [{ email: 'a@x.com', fields: 'first_name, signature' }],
      },
    })
    expect(capturedBody.data_requests[0].fields).toEqual([
      'first_name',
      'signature',
    ])
    expect(capturedBody.data_requests[0].auth_type).toBe('email_link')
    // `data` is always present, even with no pre-filled fields.
    expect(capturedBody.data).toEqual({})
  })

  it('errors when no recipient email is provided', async () => {
    await expect(
      appTester(op.perform, {
        authData,
        inputData: { template_id: 'tpl_1', data_requests: [] },
      })
    ).rejects.toThrow(/at least one recipient/i)
  })

  it('surfaces API errors', async () => {
    nock('https://api.docspring.com')
      .post('/api/v1/templates/tpl_1/submissions')
      .reply(422, { status: 'error', errors: ['Email is invalid'] })

    await expect(
      appTester(op.perform, {
        authData,
        inputData: {
          template_id: 'tpl_1',
          data_requests: [{ email: 'bad' }],
        },
      })
    ).rejects.toThrow(/Email is invalid/)
  })
})
