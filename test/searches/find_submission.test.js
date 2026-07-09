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
const op = App.searches.find_submission.operation

describe('find_submission search', () => {
  afterEach(() => nock.cleanAll())

  it('returns the submission when found by ID', async () => {
    nock('https://api.docspring.com')
      .get('/api/v1/submissions/sub_1')
      .reply(200, { id: 'sub_1', state: 'processed' })

    const results = await appTester(op.perform, {
      authData,
      inputData: { submission_id: 'sub_1' },
    })
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('sub_1')
  })

  it('returns an empty array (not an error) when the ID is not found', async () => {
    nock('https://api.docspring.com')
      .get('/api/v1/submissions/sub_missing')
      .reply(404, { status: 'error', error: 'Submission not found.' })

    const results = await appTester(op.perform, {
      authData,
      inputData: { submission_id: 'sub_missing' },
    })
    expect(results).toEqual([])
  })

  it('still surfaces non-404 errors on ID lookup', async () => {
    nock('https://api.docspring.com')
      .get('/api/v1/submissions/sub_1')
      .reply(401, {})

    await expect(
      appTester(op.perform, { authData, inputData: { submission_id: 'sub_1' } })
    ).rejects.toThrow(/Invalid DocSpring API token/)
  })

  it('lists recent submissions when no ID is given', async () => {
    nock('https://api.docspring.com')
      .get('/api/v1/submissions')
      .query(true)
      .reply(200, { submissions: [{ id: 'sub_1' }, { id: 'sub_2' }] })

    const results = await appTester(op.perform, { authData, inputData: {} })
    expect(results.map((s) => s.id)).toEqual(['sub_1', 'sub_2'])
  })
})
