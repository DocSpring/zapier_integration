'use strict'

const { makeHookTrigger } = require('../lib/hooks')
const scopeFields = require('../lib/scopeFields')
const { listCombinedSubmissions } = require('../lib/performLists')

module.exports = makeHookTrigger({
  key: 'combined_submission_processed',
  noun: 'Combined PDF',
  label: 'Combined PDF Processed',
  description:
    'Triggers when a combined PDF finishes processing and is ready to download.',
  eventType: 'combined_submission.processed',
  resource: 'combined_submission',
  // Template/folder filters can never match these events (only submission,
  // data-request, template, and folder events are template/folder scopable),
  // so only the Mode filter is offered.
  inputFields: scopeFields.modeOnly,
  performList: listCombinedSubmissions('combined_submission.processed'),
})
