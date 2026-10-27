'use strict'

// The trigger output for a version 4 webhook delivery:
//   { id, event_type, created_at, data: <the API v2 resource> }
// plus `resource_type` (the event name before the first dot) and
// `resource_id` (`data.id`).
//
// CRITICAL (dedup): Zapier deduplicates REST-hook results by each object's
// top-level `id`. That must stay the *event* ID (stable across retries), not
// the resource's ID: one resource emits several events (a submission's
// `created`, then `processed`), and with the resource ID as `id` Zapier would
// drop every event after the first. The resource is left nested under `data`,
// so its own `id` and `created_at` can't overwrite the event's.
function eventFromDelivery(body) {
  const event = body && typeof body === 'object' ? body : {}
  const eventType = event.event_type
  const data = event.data
  return {
    ...event,
    resource_type:
      typeof eventType === 'string' ? eventType.split('.')[0] : null,
    resource_id: data && data.id != null ? data.id : null,
  }
}

module.exports = { eventFromDelivery }
