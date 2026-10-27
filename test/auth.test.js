'use strict'

const nock = require('nock')
const {
  App,
  appTester,
  authData,
  API,
  apiError,
  errorFrom,
} = require('./helpers')

describe('authentication', () => {
  it('tests GET /api/v2/authentication on the region host with Basic auth and our User-Agent', async () => {
    const scope = nock(API, {
      reqheaders: {
        authorization:
          'Basic ' + Buffer.from('api_test_abc:sekret').toString('base64'),
        'user-agent': 'docspring-zapier/2.0.0',
      },
    })
      .get('/api/v2/authentication')
      .reply(200, { authenticated: true })

    const body = await appTester(App.authentication.test, { authData })
    expect(scope.isDone()).toBe(true)
    expect(body).toEqual({ authenticated: true })
  })

  it("shows API v2's error message for a 401", async () => {
    nock(API)
      .get('/api/v2/authentication')
      .reply(401, apiError('unauthorized', 'Invalid API token'))
    const error = await errorFrom(
      appTester(App.authentication.test, { authData })
    )
    expect(error.message).toBe(
      'DocSpring API error 401 unauthorized: Invalid API token\nRequest ID: req_1234567890abcdef01'
    )
    expect(error.status).toBe(401)
  })

  it("explains a self-hosted server that doesn't have API v2 yet", async () => {
    nock('https://docspring.example.com')
      .get('/api/v2/authentication')
      .reply(404, '<h1>Not Found</h1>')
    const error = await errorFrom(
      appTester(App.authentication.test, {
        authData: {
          ...authData,
          region: 'self_hosted',
          custom_host: 'docspring.example.com',
        },
      })
    )
    expect(error.message).toBe(
      "This DocSpring server doesn't have API v2 yet. Upgrade it to the latest release, or use version 1.1.0 of this integration."
    )
  })

  it('uses the EU host for the EU region', async () => {
    const scope = nock('https://api-eu.docspring.com')
      .get('/api/v2/authentication')
      .reply(200, { authenticated: true })
    await appTester(App.authentication.test, {
      authData: { ...authData, region: 'eu' },
    })
    expect(scope.isDone()).toBe(true)
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
