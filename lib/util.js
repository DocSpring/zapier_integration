'use strict'

const { DATA_FIELD_PREFIX } = require('./constants')

// Coerce a Zapier input (a single value or a `list: true` array) into a clean
// array of non-blank strings. Used for the webhook scope params, where a blank
// value must be dropped entirely rather than sent as `['']`.
function asArray(value) {
  if (value == null || value === '') return []
  const arr = Array.isArray(value) ? value : [value]
  return arr.map((v) => String(v).trim()).filter((v) => v.length > 0)
}

// Normalize a `dict: true` input (already an object) or a JSON string into a
// plain object. Returns undefined for blanks so `removeMissingValuesFrom` / the
// caller can omit it. A non-JSON string is returned as-is so the API can
// surface a clear validation error rather than us swallowing it.
function parseDict(value) {
  if (value == null || value === '') return undefined
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch (_e) {
    return value
  }
}

// Human-friendly label from a snake_case / camelCase field name.
function prettyLabel(name) {
  return String(name)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// Strip the `data__` namespace from a Generate PDF template-field key.
function unprefix(key) {
  return key.startsWith(DATA_FIELD_PREFIX)
    ? key.slice(DATA_FIELD_PREFIX.length)
    : key
}

// Normalize a self-hosted host string into an origin (scheme + host[:port], no
// trailing slash or path). Defaults to https when no scheme is given; preserves
// an explicit http:// + port for local installs.
function normalizeHost(host) {
  let value = String(host || '').trim()
  if (!value) return ''
  value = value.replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`
  }
  return value
}

module.exports = { asArray, parseDict, prettyLabel, unprefix, normalizeHost }
