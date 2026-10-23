'use strict'

const { makeHookTrigger } = require('../lib/hooks')
const { sampleList } = require('../lib/performLists')

module.exports = makeHookTrigger({
  key: 'data_request_completed',
  noun: 'Signature Request',
  label: 'Signature Request Completed',
  description:
    'Triggers when a recipient completes a signature request (signs it, or fills it in when there is nothing to sign).',
  eventType: 'submission_data_request.completed',
  resource: 'data_request',
  performList: sampleList('data_request', 'submission_data_request.completed'),
})
