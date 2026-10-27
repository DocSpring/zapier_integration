'use strict'

const { API_PREFIX } = require('./constants')
const { resolveSyncBaseUrl } = require('./regions')
const { throwForApiError } = require('./errors')
const { seg } = require('./util')

// `/api/v2/<a>/<b>/...`. Pass user-supplied IDs through `seg` so they're
// URL-encoded: apiPath('templates', seg(templateId), 'fields').
function apiPath(...parts) {
  return `${API_PREFIX}/${parts.join('/')}`
}

// A full URL on the sync host, for operations that make a file.
function syncUrl(bundle, path) {
  return `${resolveSyncBaseUrl(bundle)}${path}`
}

// z.request with a JSON body. The body is sent already serialized: the
// platform's own JSON encoding removes every {{...}} from top-level string
// values (as unfilled template tags), which would delete the Liquid tags from
// an HTML template's `html`, or text a user wrote with curly braces.
function apiRequest(z, options) {
  if (options.body === undefined || typeof options.body === 'string')
    return z.request(options)
  return z.request({ ...options, body: JSON.stringify(options.body) })
}

// GET a record by ID for a search: a 404 means "not found", which a Zapier
// search reports as an empty result (that's what makes "find or create" steps
// work), not as an error.
async function getOrNull(z, bundle, path, params) {
  const response = await z.request({
    url: path,
    method: 'GET',
    params,
    skipThrowForStatus: true,
  })
  if (response.status === 404 && response.data && response.data.error) {
    return null
  }
  throwForApiError(response, z, bundle)
  return response.data
}

// One page of a v2 list: `{data, next_cursor}`.
async function listPage(z, path, params) {
  const response = await z.request({ url: path, method: 'GET', params })
  const body = response.data || {}
  return {
    items: Array.isArray(body.data) ? body.data : [],
    nextCursor: body.next_cursor || null,
  }
}

module.exports = { apiPath, apiRequest, syncUrl, getOrNull, listPage, seg }
