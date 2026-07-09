'use strict'

const { makeHookTrigger } = require('../lib/hooks')
const scopeFields = require('../lib/scopeFields')
const { listCombinedSubmissions } = require('../lib/performLists')

module.exports = makeHookTrigger({
  key: 'combined_submission_failed',
  noun: 'Combined PDF',
  label: 'Combined PDF Failed',
  description: 'Triggers when a combined PDF fails to process.',
  eventType: 'combined_submission.failed',
  resource: 'combined_submission',
  // Template/folder filters can never match these events (only submission,
  // data-request, template, and folder events are template/folder scopable),
  // so only the Mode filter is offered.
  inputFields: scopeFields.modeOnly,
  performList: listCombinedSubmissions('combined_submission.failed'),
})
