'use strict'

const { PREVIOUS_VERSION } = require('./constants')

// The IDs an API v2 error can name, in the order they're printed.
const ERROR_RECORD_IDS = [
  ['submission_id', 'Submission'],
  ['submission_batch_id', 'Submission batch'],
  ['combined_pdf_id', 'Combined PDF'],
  ['template_id', 'Template'],
]

// What to tell the user when a record that makes a file isn't ready in time:
// after a 504 `polling_timeout`, or when our own wait (Zapier stops an action
// after 30 seconds) runs out. Keyed by the error's `*_id` property.
const NOT_READY = {
  submission_id: (id) =>
    `The PDF wasn't ready in time. Get it later with Get Submission (${id}), or use the submission.processed trigger.`,
  submission_batch_id: (id) =>
    `The PDFs weren't ready in time. Get the batch later with Get Submission Batch (${id}), or use the submission_batch.processed trigger.`,
  combined_pdf_id: (id) =>
    `The combined PDF wasn't ready in time. Get it later with Get Combined PDF (${id}), or use the combined_pdf.processed trigger.`,
  template_id: (id) =>
    `The template's PDF wasn't ready in time. Get the template later with Get Template (${id}).`,
}

function responseBody(response) {
  if (response.data !== undefined) return response.data
  try {
    return JSON.parse(response.content)
  } catch (_e) {
    // A raw response (no `content`) or a body that isn't JSON.
    return undefined
  }
}

function responseText(response) {
  try {
    return String(response.content || '').trim()
  } catch (_e) {
    return ''
  }
}

// The API v2 error object ({code, message, details, request_id, *_id}), or
// undefined when the body isn't one (a proxy's HTML page, an old server).
function apiError(response) {
  const body = responseBody(response)
  const error = body && body.error
  if (error && typeof error === 'object' && typeof error.message === 'string') {
    return error
  }
  return undefined
}

function detailLine(detail) {
  if (!detail || typeof detail !== 'object') return String(detail)
  const where = detail.pointer || detail.parameter
  const message = detail.message || detail.code || JSON.stringify(detail)
  return where ? `${where}: ${message}` : message
}

function recordLines(error) {
  return ERROR_RECORD_IDS.filter(([key]) => error[key]).map(
    ([key, label]) => `${label}: ${error[key]}`
  )
}

// The message for an HTTP error from DocSpring:
//   DocSpring API error <status> <code>: <message>
//   <pointer or parameter>: <message>     (one line per detail)
//   Submission: <submission_id>           (or the other *_id)
//   Request ID: <request_id>
function formatApiError(response) {
  const error = apiError(response)
  if (!error) {
    const body = responseText(response).slice(0, 300)
    return `DocSpring API error ${response.status}${body ? `: ${body}` : ''}`
  }

  if (error.code === 'polling_timeout') {
    const key = ERROR_RECORD_IDS.map(([k]) => k).find((k) => error[k])
    if (key) {
      const lines = [NOT_READY[key](error[key])]
      if (error.request_id) lines.push(`Request ID: ${error.request_id}`)
      return lines.join('\n')
    }
  }

  const lines = [
    `DocSpring API error ${response.status} ${error.code}: ${error.message}`,
  ]
  ;(Array.isArray(error.details) ? error.details : []).forEach((detail) =>
    lines.push(detailLine(detail))
  )
  lines.push(...recordLines(error))
  if (error.request_id) lines.push(`Request ID: ${error.request_id}`)
  return lines.join('\n')
}

function isSelfHosted(bundle) {
  const region = bundle && bundle.authData && bundle.authData.region
  return String(region || '').toLowerCase() === 'self_hosted'
}

// Throw a readable Zapier error for a DocSpring error response (status >= 400).
function throwForApiError(response, z, bundle) {
  if (response.status < 400) return response

  // A self-hosted install without API v2 answers every /api/v2 path with a 404
  // that isn't an API v2 error (a v2 server's 404s are `not_found` errors).
  if (response.status === 404 && isSelfHosted(bundle) && !apiError(response)) {
    throw new z.errors.Error(
      "This DocSpring server doesn't have API v2 yet. Upgrade it to the latest release, " +
        `or use version ${PREVIOUS_VERSION} of this integration.`,
      'ApiV2Missing',
      404
    )
  }

  const error = apiError(response)
  throw new z.errors.Error(
    formatApiError(response),
    (error && error.code) || 'DocSpringApiError',
    response.status
  )
}

module.exports = {
  NOT_READY,
  apiError,
  formatApiError,
  detailLine,
  throwForApiError,
}
