'use strict'

const { API_PREFIX } = require('./constants')
const { flattenDelivery, toDeliveryShape } = require('./payload')
const { triggerSample } = require('./resources')

// performList builders for REST-hook triggers. Each fetches recent items from a
// list endpoint and reshapes them through the delivery envelope, so the "test
// trigger" items are byte-identical in shape to live webhook deliveries.

// Submissions use cursor pagination and a wrapped `{ submissions }` response.
const listSubmissions = (eventType) => async (z, bundle) => {
  const response = await z.request({
    url: `${API_PREFIX}/submissions`,
    params: {
      limit: 10,
      type: (bundle.inputData && bundle.inputData.mode) || undefined,
      include_data: true,
    },
  })
  const items = (response.data && response.data.submissions) || []
  return items.map((item) =>
    flattenDelivery(toDeliveryShape('Submission', item, eventType))
  )
}

// Templates list returns a bare array.
const listTemplates = (eventType) => async (z) => {
  const response = await z.request({
    url: `${API_PREFIX}/templates`,
    params: { per_page: 10 },
  })
  const items = Array.isArray(response.data) ? response.data : []
  return items.map((item) =>
    flattenDelivery(toDeliveryShape('Template', item, eventType))
  )
}

// Combined submissions list returns a bare array.
const listCombinedSubmissions = (eventType) => async (z) => {
  const response = await z.request({
    url: `${API_PREFIX}/combined_submissions`,
    params: { per_page: 10 },
  })
  const items = Array.isArray(response.data) ? response.data : []
  return items.map((item) =>
    flattenDelivery(toDeliveryShape('CombinedSubmission', item, eventType))
  )
}

// For resources with no list endpoint (data requests, submission batches):
// return the trigger's own sample so Zapier's test step shows a correctly
// shaped item without fabricating live data.
const sampleList = (resourceKey, eventType) => async () => [
  triggerSample(resourceKey, eventType),
]

module.exports = {
  listSubmissions,
  listTemplates,
  listCombinedSubmissions,
  sampleList,
}
