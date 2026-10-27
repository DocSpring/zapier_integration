'use strict'

const { normalizeHost } = require('./util')

// Region → API hosts (see app/controllers/api/welcome_controller.rb).
//   host     — the standard API: webhooks, lists, searches, signature
//              requests and everything else that doesn't make a file.
//   syncHost — the sync API, for the operations that make a file (Generate
//              PDF, batches, Combine PDFs, template PDFs, more files). They
//              send `wait=false` and wait for the file themselves (lib/wait.js).
const REGIONS = {
  us: { host: 'api.docspring.com', syncHost: 'sync.api.docspring.com' },
  eu: { host: 'api-eu.docspring.com', syncHost: 'sync.api-eu.docspring.com' },
}

// Auth dropdown choices. `self_hosted` has no preset host — the user supplies a
// custom domain via the `custom_host` auth field.
const REGION_CHOICES = [
  { value: 'us', sample: 'us', label: 'United States' },
  { value: 'eu', sample: 'eu', label: 'Europe' },
  {
    value: 'self_hosted',
    sample: 'self_hosted',
    label: 'Self-hosted / Enterprise',
  },
]

function regionKey(bundle) {
  return (
    (bundle && bundle.authData && bundle.authData.region) ||
    'us'
  ).toLowerCase()
}

// Origin for a self-hosted install. Throws a clear error (rather than silently
// defaulting to the US host) if the custom host is missing — see CLAUDE.md's
// "crash fast" rule for dev/test tooling.
function selfHostedOrigin(bundle) {
  const origin = normalizeHost(
    bundle && bundle.authData && bundle.authData.custom_host
  )
  if (!origin) {
    throw new Error(
      'A custom host is required for the Self-hosted region. ' +
        'Enter your DocSpring domain (e.g. docspring.example.com) in the connection settings.'
    )
  }
  return origin
}

// Base URL for the standard API (webhooks, lists, searches, non-sync calls).
function resolveBaseUrl(bundle) {
  const region = regionKey(bundle)
  if (region === 'self_hosted') return selfHostedOrigin(bundle)
  return `https://${(REGIONS[region] || REGIONS.us).host}`
}

// Base URL for the operations that make a file. Self-hosted installs don't run a
// separate sync host, so they fall back to their single custom origin.
function resolveSyncBaseUrl(bundle) {
  const region = regionKey(bundle)
  if (region === 'self_hosted') return selfHostedOrigin(bundle)
  return `https://${(REGIONS[region] || REGIONS.us).syncHost}`
}

module.exports = { REGIONS, REGION_CHOICES, resolveBaseUrl, resolveSyncBaseUrl }
