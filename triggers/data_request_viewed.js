'use strict'

const { makeHookTrigger } = require('../lib/hooks')
const { sampleList } = require('../lib/performLists')

module.exports = makeHookTrigger({
  key: 'data_request_viewed',
  noun: 'Signature Request',
  label: 'Signature Request Viewed',
  description: 'Triggers when a recipient first views a signature request.',
  eventType: 'submission_data_request.viewed',
  resource: 'data_request',
  performList: sampleList('data_request', 'submission_data_request.viewed'),
})
