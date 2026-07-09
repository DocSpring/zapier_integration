'use strict'

const { makeHookTrigger } = require('../lib/hooks')
const scopeFields = require('../lib/scopeFields')
const { sampleList } = require('../lib/performLists')

module.exports = makeHookTrigger({
  key: 'submission_batch_failed',
  noun: 'Submission Batch',
  label: 'Submission Batch Failed',
  description:
    'Triggers when a submission batch finishes with one or more failures.',
  eventType: 'submission_batch.failed',
  resource: 'submission_batch',
  // Template/folder filters can never match these events (only submission,
  // data-request, template, and folder events are template/folder scopable),
  // so only the Mode filter is offered.
  inputFields: scopeFields.modeOnly,
  performList: sampleList('submission_batch', 'submission_batch.failed'),
})
