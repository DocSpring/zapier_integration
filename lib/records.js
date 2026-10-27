'use strict'

const { apiPath, apiRequest, syncUrl } = require('./api')
const { waitForRecord, clock } = require('./wait')
const { compact, seg } = require('./util')
const { detailLine } = require('./errors')

// How each kind of record that DocSpring makes a file for is waited on, and
// which of its final states are failures. A failure is an error naming the
// state, the error message and the record's ID (API v2 returns a failed PDF as
// a 201 with a failure `state`).

function failure(z, lines) {
  return new z.errors.Error(lines.filter(Boolean).join('\n'), 'Failed', 422)
}

function withMessage(summary, message) {
  return message ? `${summary}: ${message}` : `${summary}.`
}

function anyFilePending(files) {
  return Object.values(files || {}).some(
    (file) => file && file.state === 'pending'
  )
}

const SUBMISSION = {
  idKey: 'submission_id',
  path: (record) => apiPath('submissions', seg(record.id)),
  isPending: (s) =>
    s.state === 'pending' ||
    (s.state === 'processed' && anyFilePending(s.files)),
  throwIfFailed: (z, s) => {
    if (['processed', 'pending'].includes(s.state)) return s
    throw failure(z, [
      withMessage(
        `The PDF couldn't be generated (state: ${s.state})`,
        s.error_message
      ),
      ...(Array.isArray(s.data_errors) ? s.data_errors.map(detailLine) : []),
      `Submission: ${s.id}`,
    ])
  },
}

// Generate Submission Files: wait for the new files, and fail if one of them
// couldn't be made.
const SUBMISSION_FILES = {
  idKey: 'submission_id',
  path: SUBMISSION.path,
  isPending: (s) => anyFilePending(s.files),
  throwIfFailed: (z, s) => {
    const failed = Object.keys(s.files || {}).filter(
      (format) => s.files[format] && s.files[format].state === 'error'
    )
    if (failed.length === 0) return s
    throw failure(z, [
      ...failed.map((format) =>
        withMessage(
          `The ${format} files couldn't be made (state: error)`,
          s.files[format].error_message
        )
      ),
      `Submission: ${s.id}`,
    ])
  },
}

const SUBMISSION_BATCH = {
  idKey: 'submission_batch_id',
  path: (record) => apiPath('submissions', 'batches', seg(record.id)),
  // A batch is `error` as soon as one submission fails, while others can
  // still be pending: it has finished once `processed_at` is set.
  isPending: (b) =>
    b.state === 'pending' || (b.state === 'error' && !b.processed_at),
  throwIfFailed: (z, b) => {
    if (b.state !== 'error') return b
    const failed = (b.submissions || []).filter(
      (s) => !['processed', 'pending'].includes(s.state)
    )
    throw failure(z, [
      `Some PDFs in the batch couldn't be generated (state: error): ${b.error_count} of ${b.total_count} failed.`,
      ...failed.map((s) => withMessage(`${s.id}: ${s.state}`, s.error_message)),
      `Submission batch: ${b.id}`,
    ])
  },
}

const COMBINED_PDF = {
  idKey: 'combined_pdf_id',
  path: (record) => apiPath('combined_pdfs', seg(record.id)),
  isPending: (c) => c.state === 'pending',
  throwIfFailed: (z, c) => {
    if (['processed', 'pending'].includes(c.state)) return c
    throw failure(z, [
      withMessage(
        `The PDFs couldn't be combined (state: ${c.state})`,
        c.error_message
      ),
      `Combined PDF: ${c.id}`,
    ])
  },
}

const TEMPLATE_DOCUMENT_WAITING = ['pending', 'downloading']
const TEMPLATE = {
  idKey: 'template_id',
  path: (record) => apiPath('templates', seg(record.id)),
  isPending: (t) =>
    !!t.document && TEMPLATE_DOCUMENT_WAITING.includes(t.document.state),
  throwIfFailed: (z, t) => {
    const doc = t.document
    if (
      !doc ||
      ['processed', ...TEMPLATE_DOCUMENT_WAITING].includes(doc.state)
    ) {
      return t
    }
    throw failure(z, [
      withMessage(
        `The template's PDF couldn't be processed (state: ${doc.state})`,
        doc.error_message
      ),
      `Template: ${t.id}`,
    ])
  },
}

// Send a request that makes a file to the sync host with `wait=false`, then
// (when `wait` is true) poll the record until it's ready, within Zapier's time
// limit. Returns the record, or throws for a failure state.
async function createAndWait(
  z,
  bundle,
  { kind, method = 'POST', path, params, body, wait }
) {
  const startedAt = clock.now()
  const response = await apiRequest(z, {
    url: syncUrl(bundle, path),
    method,
    params: compact({ ...(params || {}), wait: false }),
    body,
  })
  let record = response.data
  if (wait && kind.isPending(record)) {
    record = await waitForRecord(z, {
      url: kind.path(record),
      isPending: kind.isPending,
      startedAt,
      idKey: kind.idKey,
      id: record.id,
    })
  }
  return kind.throwIfFailed(z, record)
}

module.exports = {
  SUBMISSION,
  SUBMISSION_FILES,
  SUBMISSION_BATCH,
  COMBINED_PDF,
  TEMPLATE,
  createAndWait,
}
