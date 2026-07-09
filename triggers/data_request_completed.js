'use strict'

const { makeHookTrigger } = require('../lib/hooks')
const { sampleList } = require('../lib/performLists')

module.exports = makeHookTrigger({
  key: 'data_request_completed',
  noun: 'Data Request',
  label: 'Data Request Completed',
  description:
    'Triggers when a data request (e.g. a signing or data-collection request) is completed.',
  eventType: 'submission_data_request.completed',
  resource: 'data_request',
  performList: sampleList('data_request', 'submission_data_request.completed'),
})
