'use strict'

const { normalizeHost } = require('./util')

// Region → API hosts (see app/controllers/api/welcome_controller.rb).
//   host     — the standard async API. Serves webhooks, lists, searches, and
//              PDF generation (with ?wait=true).
//   syncHost — a low-latency endpoint for *synchronous* PDF generation. The
//              create actions use it so they return the finished PDF well
//              within Zapier's perform timeout.
const REGIONS = {
  us: { host: 'api.docspring.com', syncHost: 'sync.api.docspring.com' },
  eu: { host: 'api-eu.docspring.com', syncHost: 'sync.api-eu.docspring.com' },
  au: { host: 'api-au.docspring.com', syncHost: 'sync.api-au.docspring.com' },
}

// Auth dropdown choices. `self_hosted` has no preset host — the user supplies a
// custom domain via the `custom_host` auth field.
const REGION_CHOICES = [
  { value: 'us', sample: 'us', label: 'United States' },
  { value: 'eu', sample: 'eu', label: 'Europe' },
  { value: 'au', sample: 'au', label: 'Australia' },
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

// Base URL for synchronous PDF generation. Self-hosted installs don't run a
// separate sync host, so they fall back to their single custom origin.
function resolveSyncBaseUrl(bundle) {
  const region = regionKey(bundle)
  if (region === 'self_hosted') return selfHostedOrigin(bundle)
  return `https://${(REGIONS[region] || REGIONS.us).syncHost}`
}

module.exports = { REGIONS, REGION_CHOICES, resolveBaseUrl, resolveSyncBaseUrl }
