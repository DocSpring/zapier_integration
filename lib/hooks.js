'use strict'

const { apiPath, apiRequest } = require('./api')
const { throwForApiError } = require('./errors')
const { eventFromDelivery } = require('./payload')
const { asArray, compact, seg, text } = require('./util')
const { isSignedBy, signatureHeader } = require('./signatures')
const { triggerOutputFields, triggerSample } = require('./resources')
const {
  TEMPLATE_FILTERABLE,
  TEMPLATE_FILTERABLE_TEXT,
} = require('./scopeFields')

// Subscribe: create a webhook with API v2 (always a version 4 webhook) for
// this one event. The body is flat and has no `version`; empty filters are
// left out. Zapier stores what this returns as `bundle.subscribeData`: the
// webhook's ID, to delete it, and its signing secret, to verify deliveries.
const subscribe = (eventType) => async (z, bundle) => {
  const input = bundle.inputData || {}
  const templateIds = asArray(input.template_ids)
  const folderIds = asArray(input.folder_ids)
  // Only the triggers for these events offer Templates, but check anyway:
  // API v2 refuses to create a webhook whose filters can't match its events.
  if (
    templateIds.length &&
    !TEMPLATE_FILTERABLE.includes(eventType.split('.')[0])
  ) {
    throw new z.errors.Error(
      `Templates can only filter ${TEMPLATE_FILTERABLE_TEXT}, not ${eventType}. Remove the templates.`,
      'InvalidInput',
      400
    )
  }
  const body = compact({
    url: bundle.targetUrl,
    event_types: [eventType],
    name: `Zapier: ${eventType}`,
    include_submission_data: true,
    mode: text(input.mode),
    template_ids: templateIds.length ? templateIds : undefined,
    folder_ids: folderIds.length ? folderIds : undefined,
  })
  const response = await apiRequest(z, {
    url: apiPath('webhooks'),
    method: 'POST',
    body,
  })
  return compact({ id: response.data.id, secret: response.data.secret })
}

// Unsubscribe: delete the webhook. A 404 means it's already gone (deleted in
// the dashboard, say), and turning a Zap off must always work.
const unsubscribe = async (z, bundle) => {
  const id = bundle.subscribeData && bundle.subscribeData.id
  if (!id) return {}
  const response = await z.request({
    url: apiPath('webhooks', seg(id)),
    method: 'DELETE',
    skipThrowForStatus: true,
  })
  if (response.status !== 404) throwForApiError(response, z, bundle)
  return {}
}

// An inbound delivery → the trigger output, when its X-DocSpring-Signature
// matches the raw body (`bundle.rawRequest.content`, the text as received)
// and the webhook's secret. A delivery that doesn't match is dropped: Zapier
// always answers the sender itself, so the only way to refuse it is to emit
// nothing. A subscription saved without a secret (before deliveries were
// verified) has nothing to check against, so its deliveries are emitted as
// they arrive.
const perform = async (z, bundle) => {
  const secret = bundle.subscribeData && bundle.subscribeData.secret
  if (!secret) return [eventFromDelivery(bundle.cleanedRequest)]

  const raw = bundle.rawRequest || {}
  if (!isSignedBy(secret, signatureHeader(raw.headers), raw.content)) {
    z.console.log(
      "Dropped a webhook delivery: its X-DocSpring-Signature header is missing or doesn't match its body."
    )
    return []
  }
  let event
  try {
    event = JSON.parse(raw.content)
  } catch (_e) {
    z.console.log("Dropped a webhook delivery: its body isn't JSON.")
    return []
  }
  return [eventFromDelivery(event)]
}

// Build a REST-hook trigger for one webhook event.
function makeHookTrigger({
  key,
  noun,
  label,
  description,
  eventType,
  resourceType,
  inputFields,
  performList,
}) {
  return {
    key,
    noun,
    display: { label, description },
    operation: {
      type: 'hook',
      inputFields,
      performSubscribe: subscribe(eventType),
      performUnsubscribe: unsubscribe,
      perform,
      performList,
      outputFields: triggerOutputFields(resourceType),
      sample: triggerSample(resourceType, eventType),
    },
  }
}

module.exports = { makeHookTrigger, subscribe, unsubscribe, perform }
