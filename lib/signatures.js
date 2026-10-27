'use strict'

const crypto = require('crypto')

// Verifying a webhook delivery's X-DocSpring-Signature (DocSpring docs:
// Webhooks > Verifying Signatures). The header is `t=<unix seconds>,v1=<hex>`
// and can hold several `v1`s (while a webhook's secret is being replaced);
// each `v1` is the hex HMAC-SHA256 of `"<t>.<raw body>"` with the webhook's
// secret, and the delivery is genuine when any of them matches.

const HEADER = 'x-docspring-signature'

// The header's value. In bundle.rawRequest, Zapier names every header except
// Content-Type and Content-Length with an `Http-` prefix in Camel-Case
// (`Http-X-Docspring-Signature`); the plain name is accepted too.
function signatureHeader(headers) {
  const entry = Object.entries(headers || {}).find(([name]) => {
    const lower = name.toLowerCase()
    return lower === HEADER || lower === `http-${HEADER}`
  })
  return entry ? String(entry[1]) : undefined
}

function parseSignatureHeader(value) {
  let timestamp
  const signatures = []
  String(value)
    .split(',')
    .forEach((part) => {
      const at = part.indexOf('=')
      if (at < 0) return
      const key = part.slice(0, at).trim()
      const val = part.slice(at + 1).trim()
      if (key === 't') timestamp = val
      if (key === 'v1' && val) signatures.push(val)
    })
  return { timestamp, signatures }
}

// Whether `header` signs `rawBody` (the exact text received, never a
// re-serialised object: key order and spacing change the signature) with
// `secret`. Compared in constant time. No timestamp-age check.
function isSignedBy(secret, header, rawBody) {
  if (!secret || !header || typeof rawBody !== 'string') return false
  const { timestamp, signatures } = parseSignatureHeader(header)
  if (!timestamp || signatures.length === 0) return false
  const expected = Buffer.from(
    crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`, 'utf8')
      .digest('hex')
  )
  return signatures.some((signature) => {
    const given = Buffer.from(signature)
    return (
      given.length === expected.length &&
      crypto.timingSafeEqual(given, expected)
    )
  })
}

module.exports = { signatureHeader, parseSignatureHeader, isSignedBy }
