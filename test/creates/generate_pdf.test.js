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
const op = App.creates.generate_pdf.operation

describe('generate_pdf create', () => {
  afterEach(() => nock.cleanAll())

  it('renders dynamic fields from the selected template schema', async () => {
    nock('https://api.docspring.com')
      .get('/api/v1/templates/tpl_1/schema')
      .reply(200, {
        properties: { name: { type: 'string' } },
        required: ['name'],
      })

    // The per-template fields function is the last entry in inputFields.
    const dynamicFn = op.inputFields[op.inputFields.length - 1]
    const fields = await appTester(dynamicFn, {
      authData,
      inputData: { template_id: 'tpl_1' },
    })
    expect(fields.map((f) => f.key)).toContain('data__name')
  })

  it('posts assembled data to the SYNC host with wait=true and returns the submission', async () => {
    let capturedBody
    let capturedQuery
    nock('https://sync.api.docspring.com')
      .post('/api/v1/templates/tpl_1/submissions', (body) => {
        capturedBody = body
        return true
      })
      .query((q) => {
        capturedQuery = q
        return true
      })
      .reply(200, {
        status: 'success',
        submission: {
          id: 'sub_1',
          state: 'processed',
          download_url: 'https://x/y.pdf',
        },
      })

    const bundle = {
      authData,
      inputData: {
        template_id: 'tpl_1',
        data__name: 'Jane',
        data__email: 'jane@example.com',
      },
    }
    const result = await appTester(op.perform, bundle)

    expect(result.id).toBe('sub_1')
    expect(capturedBody.data).toEqual({
      name: 'Jane',
      email: 'jane@example.com',
    })
    expect(capturedQuery.wait).toBe('true')
  })

  it('throws a friendly error when the API returns an error status', async () => {
    nock('https://sync.api.docspring.com')
      .post('/api/v1/templates/tpl_1/submissions')
      .query(true)
      .reply(200, { status: 'error', errors: ['Data is invalid'] })

    await expect(
      appTester(op.perform, { authData, inputData: { template_id: 'tpl_1' } })
    ).rejects.toThrow(/Data is invalid/)
  })
})
