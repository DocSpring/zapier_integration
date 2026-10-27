'use strict'

const { compact, isBlank, text } = require('./util')

// A template's PDF comes from a public https:// link (`document_url`, which
// DocSpring downloads, up to 100 MB) or a file from an earlier Zap step. A
// file is downloaded here and sent as `document_base64` (up to 7 MB). The
// download never carries the DocSpring credentials: the middleware only adds
// them to requests for the DocSpring API.
const MAX_BASE64_BYTES = 7 * 1024 * 1024

const documentInputs = (what) => [
  {
    key: 'document_url',
    label: 'PDF URL',
    type: 'string',
    required: false,
    helpText: `A public \`https://\` link to ${what} (up to 100 MB). Use this or PDF File.`,
  },
  {
    key: 'document_file',
    label: 'PDF File',
    type: 'file',
    required: false,
    helpText: `${what[0].toUpperCase()}${what.slice(1)} as a file from an earlier step (up to 7 MB). Use this or PDF URL.`,
  },
  {
    key: 'filename',
    label: 'Filename',
    type: 'string',
    required: false,
    helpText:
      "The PDF's file name. Default: the name of the file or the last part of the URL.",
  },
]

function filenameFrom(response, url) {
  const disposition =
    response.headers && response.headers.get('content-disposition')
  const match =
    disposition && /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)
  if (match) return decodeURIComponent(match[1].trim())
  try {
    const last = new URL(url).pathname.split('/').pop()
    if (last && /\.pdf$/i.test(last)) return decodeURIComponent(last)
  } catch (_e) {
    // Not a URL we can read a name from.
  }
  return 'document.pdf'
}

// The document properties for the request body: {document_url, filename} or
// {document_base64, filename}, or {} when neither input is set.
async function documentSource(z, input) {
  const url = text(input.document_url)
  const file = text(input.document_file)
  if (url && file) {
    throw new z.errors.Error(
      'Use PDF URL or PDF File, not both.',
      'InvalidInput',
      400
    )
  }
  if (url) return compact({ document_url: url, filename: text(input.filename) })
  if (!file) return {}

  let response
  try {
    response = await z.request({
      url: file,
      method: 'GET',
      raw: true,
      skipThrowForStatus: true,
    })
  } catch (e) {
    throw new z.errors.Error(
      `Couldn't download the PDF File: ${e.message}`,
      'DownloadFailed',
      400
    )
  }
  if (response.status >= 400) {
    throw new z.errors.Error(
      `Couldn't download the PDF File (HTTP ${response.status}).`,
      'DownloadFailed',
      400
    )
  }
  const buffer = await response.buffer()
  if (buffer.length > MAX_BASE64_BYTES) {
    throw new z.errors.Error(
      'The PDF File is larger than 7 MB. Put it at a public https:// link and use PDF URL instead.',
      'InvalidInput',
      400
    )
  }
  return {
    document_base64: buffer.toString('base64'),
    filename: text(input.filename) || filenameFrom(response, file),
  }
}

// A folder input where the user can also enter `root` for the top level.
function isRoot(value) {
  return !isBlank(value) && String(value).trim().toLowerCase() === 'root'
}

module.exports = { documentInputs, documentSource, isRoot, MAX_BASE64_BYTES }
