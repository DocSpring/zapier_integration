'use strict'

const { resolveBaseUrl } = require('./regions')

// beforeRequest: resolve the region base URL and attach HTTP Basic auth.
//
// Callers issue requests with root-relative paths (e.g. `/api/v1/webhooks`);
// this prepends the region's standard host. Create actions that need the sync
// host pass a fully-qualified absolute URL, which is detected and left as-is.
const addBaseUrlAndAuth = (request, z, bundle) => {
  if (request.url && request.url.startsWith('/')) {
    request.url = resolveBaseUrl(bundle) + request.url
  }

  const authData = bundle.authData || {}
  request.headers = request.headers || {}

  if (authData.token_id) {
    const basic = Buffer.from(
      `${authData.token_id}:${authData.token_secret || ''}`
    ).toString('base64')
    request.headers.Authorization = `Basic ${basic}`
  }

  request.headers.Accept = request.headers.Accept || 'application/json'
  if (request.body && !request.headers['Content-Type']) {
    request.headers['Content-Type'] = 'application/json'
  }

  return request
}

// Turn a DocSpring API error response into a readable Zapier error. Called by
// the afterResponse middleware for every request that didn't opt out, and
// directly by opted-out callers once they've handled the statuses they
// expected (it intentionally ignores the opt-out flag, so those callers can
// re-apply standard error handling to everything else).
const throwForApiError = (response, z) => {
  if (response.status < 400) return response

  let message = `DocSpring API error (HTTP ${response.status}).`

  if (response.status === 401) {
    message =
      'Invalid DocSpring API token. Check your Token ID, secret, and region.'
  } else {
    try {
      const body = response.json || JSON.parse(response.content)
      if (body && Array.isArray(body.errors) && body.errors.length) {
        message = body.errors.join(', ')
      } else if (body && body.error) {
        message = body.error
      }
    } catch (_e) {
      // Non-JSON error body — keep the generic message.
    }
  }

  throw new z.errors.Error(message, 'DocSpringApiError', response.status)
}

// afterResponse: surface DocSpring API errors as readable Zapier errors.
// `flags.skipThrowForStatus` keeps the platform from throwing on non-2xx, so
// error messaging is centralized here instead of in every perform. Requests
// that expect certain error statuses (a search treating 404 as "not found",
// unsubscribe tolerating an already-deleted webhook) opt out with the
// platform's own `skipThrowForStatus` request option and call
// throwForApiError themselves for the statuses they don't expect.
const checkForErrors = (response, z, _bundle) => {
  if (response.request && response.request.skipThrowForStatus) return response

  return throwForApiError(response, z)
}

module.exports = { addBaseUrlAndAuth, checkForErrors, throwForApiError }
