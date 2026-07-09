'use strict'

const nock = require('nock')
const zapier = require('zapier-platform-core')
const App = require('../index')

const appTester = zapier.createAppTester(App)
const authData = {
  region: 'us',
  token_id: 'api_test_abc',
  token_secret: 'sekret',
}

describe('authentication', () => {
  afterEach(() => nock.cleanAll())

  it('tests against the region host with a Basic auth header', async () => {
    const scope = nock('https://api.docspring.com', {
      reqheaders: {
        authorization:
          'Basic ' + Buffer.from('api_test_abc:sekret').toString('base64'),
      },
    })
      .get('/api/v1/authentication')
      .reply(200, { status: 'success' })

    // nock only matches when the region host + exact Basic auth header line up,
    // so scope.isDone() is the real assertion here.
    const body = await appTester(App.authentication.test, { authData })
    expect(scope.isDone()).toBe(true)
    expect(body.status).toBe('success')
  })

  it('surfaces a 401 as a friendly error', async () => {
    nock('https://api.docspring.com')
      .get('/api/v1/authentication')
      .reply(401, {})
    await expect(
      appTester(App.authentication.test, { authData })
    ).rejects.toThrow(/Invalid DocSpring API token/)
  })

  it('derives a Test/Live connection label from the token id and region', () => {
    expect(App.authentication.connectionLabel({}, { authData })).toMatch(
      /DocSpring Test · US/
    )
    expect(
      App.authentication.connectionLabel(
        {},
        { authData: { region: 'eu', token_id: 'api_xyz' } }
      )
    ).toMatch(/DocSpring Live · EU/)
  })
})
