'use strict'

const submission = require('./submission')
const signatureRequest = require('./signatureRequest')
const combinedPdf = require('./combinedPdf')
const submissionBatch = require('./submissionBatch')
const template = require('./template')
const other = require('./other')

// Resources by the name webhook events use for them (the event name before
// the first dot), which is also the trigger output's `resource_type`.
const RESOURCES = {
  submission,
  signature_request: signatureRequest,
  combined_pdf: combinedPdf,
  submission_batch: submissionBatch,
  template,
  custom_file: other.customFile,
  folder: other.folder,
}

function resource(resourceType) {
  const found = RESOURCES[resourceType]
  if (!found) throw new Error(`Unknown resource type: ${resourceType}`)
  return found
}

// Output fields of every trigger: the version 4 event's own fields, plus
// `resource_type` and `resource_id`. The resource itself is under `data`.
const EVENT_FIELDS = [
  { key: 'id', label: 'Event ID', type: 'string' },
  { key: 'event_type', label: 'Event Type', type: 'string' },
  { key: 'created_at', label: 'Event Created At', type: 'datetime' },
  { key: 'resource_type', label: 'Resource Type', type: 'string' },
  { key: 'resource_id', label: 'Resource ID', type: 'string' },
]

function triggerOutputFields(resourceType) {
  const { noun, outputFields } = resource(resourceType)
  return EVENT_FIELDS.concat(
    outputFields.map((field) => ({
      ...field,
      key: `data__${field.key}`,
      label: field.key === 'id' ? field.label : `${noun}: ${field.label}`,
    }))
  )
}

// An event shaped exactly as `perform` outputs a delivery.
function eventFor(resourceType, eventType, record, eventId, createdAt) {
  return {
    id: eventId,
    event_type: eventType,
    created_at: createdAt,
    data: record,
    resource_type: resourceType,
    resource_id: record && record.id != null ? record.id : null,
  }
}

function triggerSample(resourceType, eventType) {
  return eventFor(
    resourceType,
    eventType,
    resource(resourceType).sample,
    '6f1c2e8a-3b4d-4c5e-9f60-7a8b9c0d1e2f',
    '2026-10-27T09:00:05Z'
  )
}

module.exports = {
  RESOURCES,
  EVENT_FIELDS,
  resource,
  triggerOutputFields,
  triggerSample,
  eventFor,
}
