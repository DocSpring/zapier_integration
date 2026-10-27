'use strict'

// A generated file (`GeneratedFile` in the v2 OpenAPI spec): a submission's or
// combined PDF's `files.pdf`, `files.audit_trail` and `files.preview`.
// Zapier flattens nested objects with `__`, so `files.pdf.download_url` is
// mapped as `files__pdf__download_url`.
function generatedFileFields(prefix, name) {
  return [
    {
      key: `${prefix}__download_url`,
      label: `${name} Download URL`,
      type: 'string',
    },
    {
      key: `${prefix}__permanent_url`,
      label: `${name} Permanent URL`,
      type: 'string',
    },
    { key: `${prefix}__filename`, label: `${name} Filename`, type: 'string' },
    { key: `${prefix}__size`, label: `${name} Size (bytes)`, type: 'integer' },
    { key: `${prefix}__sha256`, label: `${name} SHA-256 Hash`, type: 'string' },
    { key: `${prefix}__state`, label: `${name} State`, type: 'string' },
    {
      key: `${prefix}__error_message`,
      label: `${name} Error Message`,
      type: 'string',
    },
  ]
}

function generatedFileSample(id, kind, filename) {
  return {
    state: 'processed',
    error_message: null,
    download_url: `https://downloads.docspring.com/store/${filename}?Expires=1761555600&Signature=...&Key-Pair-Id=...`,
    permanent_url: `https://app.docspring.com/${kind}/${id}/files/pdf`,
    filename,
    content_type: 'application/pdf',
    size: 48213,
    sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
  }
}

module.exports = { generatedFileFields, generatedFileSample }
