'use strict'

// Small input helpers. `flags.cleanInputData` is false (Zapier check D028), so
// blank inputs reach perform as '', null, [], [''] or {} and every helper here
// turns a blank into `undefined`, which `compact` then leaves out of the
// request: v2 rejects "" and null for most optional properties.

function isBlank(value) {
  if (value == null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.every(isBlank)
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

// A Zapier input (a single value or a `list: true` array) as a clean array of
// non-blank strings.
function asArray(value) {
  if (value == null || value === '') return []
  const arr = Array.isArray(value) ? value : [value]
  return arr.map((v) => String(v).trim()).filter((v) => v.length > 0)
}

// A list of names, where each entry may itself hold several names separated by
// commas or new lines (a value mapped from an earlier step often does).
function splitNames(value) {
  const names = []
  asArray(value).forEach((entry) => {
    entry
      .split(/[\n,]/)
      .map((name) => name.trim())
      .filter(Boolean)
      .forEach((name) => {
        if (!names.includes(name)) names.push(name)
      })
  })
  return names
}

// A real boolean from a Zapier boolean input (which can arrive as a boolean or
// as text). Blank is undefined; anything else that isn't a yes/no is an error.
const TRUE_WORDS = ['true', 'yes', 'y', 't', '1', 'on']
const FALSE_WORDS = ['false', 'no', 'n', 'f', '0', 'off']
function toBoolean(z, value, label) {
  if (isBlank(value)) return undefined
  if (typeof value === 'boolean') return value
  const word = String(value).trim().toLowerCase()
  if (TRUE_WORDS.includes(word)) return true
  if (FALSE_WORDS.includes(word)) return false
  throw new z.errors.Error(
    `${label} must be true or false, not "${value}".`,
    'InvalidInput',
    400
  )
}

// A real integer from a Zapier integer input. Blank is undefined.
function toInteger(z, value, label) {
  if (isBlank(value)) return undefined
  if (typeof value === 'number' && Number.isInteger(value)) return value
  const text = String(value).trim()
  if (/^-?\d+$/.test(text)) return parseInt(text, 10)
  throw new z.errors.Error(
    `${label} must be a whole number, not "${value}".`,
    'InvalidInput',
    400
  )
}

// A JSON value from a `dict` input (already an object) or a text/code input
// (JSON text). Blank is undefined. `kind` is 'object' or 'array'.
function parseJson(z, value, label, kind = 'object') {
  if (isBlank(value)) return undefined
  let parsed = value
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value)
    } catch (e) {
      throw new z.errors.Error(
        `${label} must be valid JSON: ${e.message}`,
        'InvalidInput',
        400
      )
    }
  }
  const isArray = Array.isArray(parsed)
  const ok =
    kind === 'array'
      ? isArray
      : parsed !== null && typeof parsed === 'object' && !isArray
  if (!ok) {
    throw new z.errors.Error(
      `${label} must be a JSON ${kind === 'array' ? 'list ([...])' : 'object ({...})'}.`,
      'InvalidInput',
      400
    )
  }
  return parsed
}

// A trimmed string, or undefined when blank.
function text(value) {
  if (isBlank(value)) return undefined
  return String(value).trim()
}

// Drop undefined properties so they're left out of the request body.
function compact(object) {
  const out = {}
  Object.keys(object).forEach((key) => {
    if (object[key] !== undefined) out[key] = object[key]
  })
  return out
}

// A path segment from a user-supplied ID.
function seg(id) {
  return encodeURIComponent(String(id).trim())
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

// Strict shape for a self-hosted host: optional http(s) scheme, a hostname or
// IPv4 address, optional port. Nothing else — no path, query string, fragment,
// credentials, or whitespace — because the value is spliced straight into
// every API URL (Zapier check D026: user-supplied domains must be validated so
// a connection can't be pointed at an arbitrary URL).
const HOST_LABEL = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?'
const SELF_HOSTED_HOST_RE = new RegExp(
  '^(?:https?://)?' + HOST_LABEL + '(?:\\.' + HOST_LABEL + ')*(?::\\d{1,5})?$',
  'i'
)

// Normalize a self-hosted host string into an origin (scheme + host[:port], no
// trailing slash or path). Defaults to https when no scheme is given; preserves
// an explicit http:// + port for local installs. Returns '' for a blank value
// (the caller decides whether that's an error) and throws for anything that
// isn't a plain host[:port].
function normalizeHost(host) {
  let value = String(host || '').trim()
  if (!value) return ''
  value = value.replace(/\/+$/, '')
  if (!SELF_HOSTED_HOST_RE.test(value)) {
    throw new Error(
      `Invalid self-hosted host "${value}". Enter only your DocSpring domain, ` +
        'e.g. docspring.example.com or http://localhost:3000 (no path, query string, or credentials).'
    )
  }
  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`
  }
  return value
}

module.exports = {
  isBlank,
  asArray,
  splitNames,
  toBoolean,
  toInteger,
  parseJson,
  text,
  compact,
  seg,
  prettyLabel,
  normalizeHost,
}
