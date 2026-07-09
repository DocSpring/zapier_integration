'use strict'

const { addBaseUrlAndAuth, checkForErrors } = require('../../lib/middleware')

// Minimal stand-in for the `z` object the platform passes to middleware.
const z = {
  errors: {
    Error: class ZapierError extends Error {
      constructor(message, name, status) {
        super(message)
        this.name = name
        this.status = status
      }
    },
  },
}

const bundle = {
  authData: { region: 'eu', token_id: 'api_test_abc', token_secret: 'sekret' },
}

describe('addBaseUrlAndAuth', () => {
  it('prepends the region base URL to root-relative paths', () => {
    const req = addBaseUrlAndAuth({ url: '/api/v1/webhooks' }, z, bundle)
    expect(req.url).toBe('https://api-eu.docspring.com/api/v1/webhooks')
  })

  it('leaves absolute (sync host) URLs untouched', () => {
    const url =
      'https://sync.api-eu.docspring.com/api/v1/templates/tpl_1/submissions'
    expect(addBaseUrlAndAuth({ url }, z, bundle).url).toBe(url)
  })

  it('attaches a Basic auth header from the token id/secret', () => {
    const req = addBaseUrlAndAuth({ url: '/api/v1/authentication' }, z, bundle)
    const expected =
      'Basic ' + Buffer.from('api_test_abc:sekret').toString('base64')
    expect(req.headers.Authorization).toBe(expected)
  })

  it('defaults the content-type when sending a body', () => {
    const req = addBaseUrlAndAuth({ url: '/x', body: { a: 1 } }, z, bundle)
    expect(req.headers['Content-Type']).toBe('application/json')
  })
})

describe('checkForErrors', () => {
  it('passes through 2xx responses', () => {
    const response = { status: 200 }
    expect(checkForErrors(response, z, bundle)).toBe(response)
  })

  it('throws a friendly message on 401', () => {
    expect(() => checkForErrors({ status: 401 }, z, bundle)).toThrow(
      /Invalid DocSpring API token/
    )
  })

  it('surfaces the API errors array', () => {
    expect(() =>
      checkForErrors(
        { status: 422, json: { errors: ['Data is invalid'] } },
        z,
        bundle
      )
    ).toThrow('Data is invalid')
  })

  it('surfaces a single error string', () => {
    expect(() =>
      checkForErrors({ status: 404, json: { error: 'Not found' } }, z, bundle)
    ).toThrow('Not found')
  })

  it('respects the per-request skipThrowForStatus opt-out', () => {
    const response = { status: 404, request: { skipThrowForStatus: true } }
    expect(checkForErrors(response, z, bundle)).toBe(response)
  })
})
