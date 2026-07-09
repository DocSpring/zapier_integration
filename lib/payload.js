'use strict'

// Flatten a v3 webhook delivery body into a single, Zapier-friendly object.
//
// Delivery shape (app/jobs/webhook_delivery_job.rb #prepare_body):
//   { id, event, timestamp, data: { resource: {type, id}, ...resourceFields } }
//
// CRITICAL — dedup correctness: Zapier deduplicates REST-hook results by each
// object's top-level `id`. That must be the *event* id (a uuid, stable across
// retries), NOT the resource's own id — otherwise a single resource emitting
// more than one event (e.g. a submission's `created` then `processed`) would
// collide and later events would be silently dropped. So `id` stays the event
// id and the resource's id is exposed separately as `resource_id`.
function flattenDelivery(body) {
  const safe = body || {}
  const data = safe.data || {}
  const resource = data.resource || {}

  // Peel the resource's own `id` (and the nested `resource` ref) off the data
  // object so neither can overwrite the event-level fields when spread.
  const { id: resourceId, resource: _resourceRef, ...rest } = data

  return {
    id: safe.id,
    event: safe.event,
    timestamp: safe.timestamp,
    resource_type: resource.type,
    resource_id: resourceId != null ? resourceId : resource.id,
    ...rest,
  }
}

// Wrap a plain API resource object (from a list endpoint) in the same delivery
// envelope, so performList items flatten to exactly the shape live deliveries
// do. `resourceType` is the Rails class name used in delivery `data.resource`.
function toDeliveryShape(resourceType, resourceObject, eventType) {
  const obj = resourceObject || {}
  return {
    id: `${eventType || 'sample'}-${obj.id || ''}`,
    event: eventType,
    timestamp: obj.processed_at || obj.completed_at || obj.updated_at || null,
    data: {
      resource: { type: resourceType, id: obj.id },
      ...obj,
    },
  }
}

module.exports = { flattenDelivery, toDeliveryShape }
