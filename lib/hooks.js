'use strict'

const { API_PREFIX, WEBHOOK_VERSION } = require('./constants')
const { asArray } = require('./util')
const { throwForApiError } = require('./middleware')
const { flattenDelivery } = require('./payload')
const scopeFields = require('./scopeFields')
const { triggerOutputFields, triggerSample } = require('./resources')

// Create a REST-hook subscription. DocSpring calls `bundle.targetUrl` whenever
// the event fires. Returns the created webhook (incl. `uid`), which Zapier
// stores as `bundle.subscribeData`.
const subscribe = (eventType) => async (z, bundle) => {
  const input = bundle.inputData || {}
  const body = {
    webhook: {
      url: bundle.targetUrl,
      event_types: [eventType],
      include_submission_data: true,
      version: WEBHOOK_VERSION,
      name: `Zapier · ${eventType}`,
      mode: input.mode || undefined,
      template_uids: asArray(input.template_uids),
      folder_uids: asArray(input.folder_uids),
    },
  }
  const response = await z.request({
    url: `${API_PREFIX}/webhooks`,
    method: 'POST',
    body,
  })
  return response.data
}

// Remove the subscription when the Zap is turned off. Tolerates a webhook that
// was already deleted (e.g. manually, in the DocSpring dashboard) — turning a
// Zap off must always succeed.
const unsubscribe = () => async (z, bundle) => {
  const uid = bundle.subscribeData && bundle.subscribeData.uid
  if (uid) {
    const response = await z.request({
      url: `${API_PREFIX}/webhooks/${uid}`,
      method: 'DELETE',
      skipThrowForStatus: true,
    })
    if (response.status !== 404) throwForApiError(response, z)
  }
  return {}
}

// Parse an inbound delivery into the flattened trigger output.
const perform = () => async (z, bundle) => [
  flattenDelivery(bundle.cleanedRequest),
]

// Factory: build a complete REST-hook trigger from a small spec. All the real
// logic lives here and in lib/; each trigger module is just configuration.
function makeHookTrigger(spec) {
  const {
    key,
    noun,
    label,
    description,
    eventType,
    resource,
    performList,
    hidden = false,
    inputFields = scopeFields.standard,
  } = spec

  return {
    key,
    noun,
    display: { label, description, hidden: !!hidden },
    operation: {
      type: 'hook',
      inputFields,
      performSubscribe: subscribe(eventType),
      performUnsubscribe: unsubscribe(),
      perform: perform(),
      performList,
      outputFields: triggerOutputFields(resource),
      sample: triggerSample(resource, eventType),
    },
  }
}

module.exports = { makeHookTrigger, subscribe, unsubscribe, perform }
