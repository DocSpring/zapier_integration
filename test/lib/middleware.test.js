'use strict'

const nock = require('nock')
const { addBaseUrlAndAuth, checkForErrors } = require('../../lib/middleware')
const { appTester, authData, API, apiError, errorFrom } = require('../helpers')

// Minimal stand-in for the `z` object the platform passes to middleware.
const z = {
  errors: {
    Error: class ZapierError extends Error {
      constructor(message, code, status) {
        super(message)
        this.code = code
        this.status = status
      }
    },
  },
}

const bundle = {
  authData: { region: 'eu', token_id: 'api_test_abc', token_secret: 'sekret' },
}
const BASIC = 'Basic ' + Buffer.from('api_test_abc:sekret').toString('base64')

describe('addBaseUrlAndAuth', () => {
  it('prepends the region base URL to root-relative paths', () => {
    const req = addBaseUrlAndAuth({ url: '/api/v2/webhooks' }, z, bundle)
    expect(req.url).toBe('https://api-eu.docspring.com/api/v2/webhooks')
  })

  it('leaves full sync host URLs as they are, and authenticates them', () => {
    const url =
      'https://sync.api-eu.docspring.com/api/v2/templates/tpl_1/submissions'
    const req = addBaseUrlAndAuth({ url }, z, bundle)
    expect(req.url).toBe(url)
    expect(req.headers.Authorization).toBe(BASIC)
  })

  it('sends Basic auth and the docspring-zapier User-Agent to DocSpring', () => {
    const req = addBaseUrlAndAuth({ url: '/api/v2/authentication' }, z, bundle)
    expect(req.headers.Authorization).toBe(BASIC)
    expect(req.headers['User-Agent']).toBe('docspring-zapier/2.0.0')
  })

  it('never sends the DocSpring credentials to another host', () => {
    const req = addBaseUrlAndAuth(
      { url: 'https://files.example.com/form.pdf', headers: {} },
      z,
      bundle
    )
    expect(req.headers.Authorization).toBeUndefined()
    expect(req.headers['User-Agent']).toBeUndefined()
    // Another region's host isn't this connection's DocSpring either.
    const us = addBaseUrlAndAuth(
      { url: 'https://api.docspring.com/api/v2/x', headers: {} },
      z,
      bundle
    )
    expect(us.headers.Authorization).toBeUndefined()
  })

  it('sends one JSON content type with a body', () => {
    const req = addBaseUrlAndAuth(
      {
        url: '/x',
        body: { a: 1 },
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'user-agent': 'Zapier',
        },
      },
      z,
      bundle
    )
    expect(req.headers).toEqual({
      Authorization: BASIC,
      'User-Agent': 'docspring-zapier/2.0.0',
      Accept: 'application/json',
      'Content-Type': 'application/json',
    })
  })
})

describe('checkForErrors', () => {
  const res = (
    status,
    data,
    url = 'https://api-eu.docspring.com/api/v2/x'
  ) => ({
    status,
    data,
    content: data === undefined ? '' : JSON.stringify(data),
    request: { url },
  })

  it('passes through 2xx responses', () => {
    const response = res(200, {})
    expect(checkForErrors(response, z, bundle)).toBe(response)
  })

  it('shows the code, message, each detail, the record and the request ID', () => {
    const body = apiError(
      'invalid_data',
      "The data doesn't match the template's fields",
      {
        details: [
          {
            code: 'required',
            message: 'is required',
            pointer: '/data/last_name',
          },
          {
            code: 'type',
            message: 'must be a boolean',
            parameter: 'include_data',
          },
          { code: 'other', message: 'something about the whole request' },
        ],
        submission_id: 'sub_1',
      }
    )
    expect(() => checkForErrors(res(422, body), z, bundle)).toThrow(
      [
        "DocSpring API error 422 invalid_data: The data doesn't match the template's fields",
        '/data/last_name: is required',
        'include_data: must be a boolean',
        'something about the whole request',
        'Submission: sub_1',
        'Request ID: req_1234567890abcdef01',
      ].join('\n')
    )
  })

  it('never shows [object Object]', () => {
    let message
    try {
      checkForErrors(
        res(404, apiError('not_found', 'Submission not found')),
        z,
        bundle
      )
    } catch (e) {
      message = e.message
    }
    expect(message).toBe(
      'DocSpring API error 404 not_found: Submission not found\nRequest ID: req_1234567890abcdef01'
    )
    expect(message).not.toMatch(/object Object/)
  })

  it('tells the user how to get a record that was still processing after a 504', () => {
    const body = apiError(
      'polling_timeout',
      'Timed out waiting for the submission to be processed.',
      {
        submission_id: 'sub_9',
      }
    )
    expect(() => checkForErrors(res(504, body), z, bundle)).toThrow(
      "The PDF wasn't ready in time. Get it later with Get Submission (sub_9), or use the submission.processed trigger."
    )
    const combined = apiError('polling_timeout', 'Timed out.', {
      combined_pdf_id: 'com_9',
    })
    expect(() => checkForErrors(res(504, combined), z, bundle)).toThrow(
      /Get Combined PDF \(com_9\)/
    )
  })

  it("shows the body of an error that isn't an API v2 error", () => {
    const response = {
      status: 502,
      content: 'Bad Gateway',
      request: { url: 'https://api-eu.docspring.com/api/v2/x' },
    }
    expect(() => checkForErrors(response, z, bundle)).toThrow(
      'DocSpring API error 502: Bad Gateway'
    )
  })

  it('respects the per-request skipThrowForStatus opt-out', () => {
    const response = { ...res(404, {}), request: { skipThrowForStatus: true } }
    expect(checkForErrors(response, z, bundle)).toBe(response)
  })
})

describe('errors from a real request', () => {
  it('throw for an ordinary request (the platform flag no longer hides them)', async () => {
    nock(API)
      .get('/api/v2/templates/tpl_x')
      .reply(404, apiError('not_found', 'Template not found'))
    const error = await errorFrom(
      appTester(async (zz) => zz.request({ url: '/api/v2/templates/tpl_x' }), {
        authData,
      })
    )
    expect(error.message).toBe(
      'DocSpring API error 404 not_found: Template not found\nRequest ID: req_1234567890abcdef01'
    )
  })
})
