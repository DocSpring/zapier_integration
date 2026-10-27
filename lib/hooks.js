'use strict'

const { apiPath, apiRequest } = require('./api')
const { throwForApiError } = require('./errors')
const { eventFromDelivery } = require('./payload')
const { asArray, compact, seg, text } = require('./util')
const { triggerOutputFields, triggerSample } = require('./resources')
const {
  TEMPLATE_FILTERABLE,
  TEMPLATE_FILTERABLE_TEXT,
} = require('./scopeFields')

// Subscribe: create a webhook with API v2 (always a version 4 webhook) for
// this one event. The body is flat and has no `version`; empty filters are
// left out. Zapier stores what this returns as `bundle.subscribeData`: only
// the webhook's ID, so the webhook's signing secret isn't kept at Zapier.
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
  return { id: response.data.id }
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

// An inbound delivery → the trigger output.
const perform = async (z, bundle) => [eventFromDelivery(bundle.cleanedRequest)]

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
