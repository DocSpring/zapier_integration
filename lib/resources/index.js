'use strict'

const submission = require('./submission')
const template = require('./template')
const combinedSubmission = require('./combinedSubmission')
const batch = require('./batch')
const dataRequest = require('./dataRequest')
const folder = require('./folder')

// Resource registry, keyed by the short name used in trigger definitions.
const RESOURCES = {
  submission,
  template,
  combined_submission: combinedSubmission,
  submission_batch: batch,
  data_request: dataRequest,
  folder,
}

// Output fields present on every trigger (the flattened event envelope from
// lib/payload.js flattenDelivery).
const ENVELOPE_FIELDS = [
  { key: 'id', label: 'Event ID', type: 'string' },
  { key: 'event', label: 'Event Type', type: 'string' },
  { key: 'timestamp', label: 'Event Timestamp', type: 'datetime' },
  { key: 'resource_type', label: 'Resource Type', type: 'string' },
  { key: 'resource_id', label: 'Resource ID', type: 'string' },
]

const SAMPLE_EVENT_ID = 'evt_000000000000000000000000000001'
const SAMPLE_TIMESTAMP = '2026-06-30T12:00:00Z'

function resource(resourceKey) {
  const found = RESOURCES[resourceKey]
  if (!found) throw new Error(`Unknown resource: ${resourceKey}`)
  return found
}

// Full trigger output schema: envelope + resource-specific fields.
function triggerOutputFields(resourceKey) {
  return ENVELOPE_FIELDS.concat(resource(resourceKey).outputFields)
}

// Full trigger sample (flattened), matching what flattenDelivery produces.
function triggerSample(resourceKey, eventType) {
  const found = resource(resourceKey)
  return {
    id: SAMPLE_EVENT_ID,
    event: eventType,
    timestamp: SAMPLE_TIMESTAMP,
    resource_type: found.type,
    ...found.sample,
  }
}

// Output schema for a create/search that returns the raw resource. Unlike a
// trigger, the natural `id` here is the resource's own id (not an event id), so
// there is no envelope — just `id` + the resource fields.
function resourceCreateFields(resourceKey) {
  const found = resource(resourceKey)
  return [{ key: 'id', label: `${found.type} ID`, type: 'string' }].concat(
    found.outputFields
  )
}

// Matching sample for a create/search: the resource sample with its
// `resource_id` promoted to `id`.
function resourceCreateSample(resourceKey) {
  const found = resource(resourceKey)
  const { resource_id: resourceId, ...rest } = found.sample
  return { id: resourceId, ...rest }
}

module.exports = {
  RESOURCES,
  ENVELOPE_FIELDS,
  triggerOutputFields,
  triggerSample,
  resourceCreateFields,
  resourceCreateSample,
}
