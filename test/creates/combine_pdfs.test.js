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
const op = App.creates.combine_pdfs.operation

describe('combine_pdfs create', () => {
  afterEach(() => nock.cleanAll())

  it('posts source PDFs to the SYNC host with wait=true and returns the combined submission', async () => {
    let capturedBody
    let capturedQuery
    nock('https://sync.api.docspring.com')
      .post('/api/v1/combined_submissions', (body) => {
        capturedBody = body
        return true
      })
      .query((query) => {
        capturedQuery = query
        return true
      })
      .reply(201, {
        status: 'success',
        combined_submission: { id: 'com_1', state: 'processed' },
      })

    const result = await appTester(op.perform, {
      authData,
      inputData: {
        source_pdfs: [
          { type: 'submission', id: 'sub_1' },
          { type: 'template', id: 'tpl_1', template_version: '2' },
        ],
      },
    })

    expect(result.id).toBe('com_1')
    expect(capturedQuery.wait).toBe('true')
    expect(capturedBody.source_pdfs).toEqual([
      { type: 'submission', id: 'sub_1' },
      { type: 'template', id: 'tpl_1', template_version: '2' },
    ])
    // The API derives test/live from the token — there is no `test` param.
    expect(capturedBody).not.toHaveProperty('test')
  })

  it('does not offer a test input field (the API ignores it)', () => {
    const keys = op.inputFields.map((field) => field.key)
    expect(keys).not.toContain('test')
    expect(keys).toContain('source_pdfs')
  })
})
