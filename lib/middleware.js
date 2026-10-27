'use strict'

const { resolveBaseUrl, resolveSyncBaseUrl } = require('./regions')
const { USER_AGENT } = require('./constants')
const { throwForApiError } = require('./errors')

function originOf(url) {
  try {
    return new URL(url).origin
  } catch (_e) {
    return undefined
  }
}

// Whether a request goes to this connection's DocSpring API (its standard or
// sync host). Only those get the API token: a request to anywhere else, such
// as downloading a file a user mapped into Create Template, must never carry
// the DocSpring credentials.
function isDocSpringUrl(url, bundle) {
  const origin = originOf(url)
  if (!origin) return false
  return [resolveBaseUrl(bundle), resolveSyncBaseUrl(bundle)]
    .map(originOf)
    .includes(origin)
}

// Set a header, replacing any other spelling of it (the platform has already
// added `user-agent: Zapier`).
function setHeader(headers, name, value) {
  Object.keys(headers).forEach((key) => {
    if (key.toLowerCase() === name.toLowerCase()) delete headers[key]
  })
  headers[name] = value
}

// beforeRequest: resolve the region base URL and attach HTTP Basic auth and our
// User-Agent.
//
// Callers issue requests with root-relative paths (e.g. `/api/v2/webhooks`);
// this prepends the region's standard host. Operations that make a file pass a
// full URL on the sync host, which is left as it is.
const addBaseUrlAndAuth = (request, z, bundle) => {
  if (request.url && request.url.startsWith('/')) {
    request.url = resolveBaseUrl(bundle) + request.url
  }
  if (!isDocSpringUrl(request.url, bundle)) return request

  const authData = bundle.authData || {}
  request.headers = request.headers || {}

  if (authData.token_id) {
    const basic = Buffer.from(
      `${authData.token_id}:${authData.token_secret || ''}`
    ).toString('base64')
    request.headers.Authorization = `Basic ${basic}`
  }

  setHeader(request.headers, 'User-Agent', USER_AGENT)
  setHeader(request.headers, 'Accept', 'application/json')
  // API v2 takes only JSON bodies (anything else is a 415). One header, not
  // the platform's `application/json; charset=utf-8` as well as ours.
  if (request.body)
    setHeader(request.headers, 'Content-Type', 'application/json')

  return request
}

// afterResponse: turn DocSpring API errors into readable Zapier errors.
// Requests that expect certain error statuses (a search treating 404 as "not
// found", unsubscribe tolerating an already-deleted webhook) set the
// platform's `skipThrowForStatus` on the request and call throwForApiError
// themselves for the statuses they don't expect. Responses from other hosts
// are left to the platform's own status check.
const checkForErrors = (response, z, bundle) => {
  if (response.request && response.request.skipThrowForStatus) return response
  if (response.status < 400) return response
  if (!isDocSpringUrl(response.request && response.request.url, bundle)) {
    return response
  }
  return throwForApiError(response, z, bundle)
}

module.exports = {
  addBaseUrlAndAuth,
  checkForErrors,
  throwForApiError,
  isDocSpringUrl,
}
