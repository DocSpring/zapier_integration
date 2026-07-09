'use strict'

const { makeHookTrigger } = require('../lib/hooks')
const scopeFields = require('../lib/scopeFields')
const { sampleList } = require('../lib/performLists')

module.exports = makeHookTrigger({
  key: 'submission_batch_processed',
  noun: 'Submission Batch',
  label: 'Submission Batch Processed',
  description:
    'Triggers when every submission in a batch has finished processing.',
  eventType: 'submission_batch.processed',
  resource: 'submission_batch',
  // Template/folder filters can never match these events (only submission,
  // data-request, template, and folder events are template/folder scopable),
  // so only the Mode filter is offered.
  inputFields: scopeFields.modeOnly,
  performList: sampleList('submission_batch', 'submission_batch.processed'),
})
