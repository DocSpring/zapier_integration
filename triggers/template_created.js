'use strict'

const { makeHookTrigger } = require('../lib/hooks')
const { listTemplates } = require('../lib/performLists')
const scopeFields = require('../lib/scopeFields')

module.exports = makeHookTrigger({
  key: 'template_created',
  noun: 'Template',
  label: 'Template Created',
  description: 'Triggers when a new template is created in your account.',
  eventType: 'template.created',
  resource: 'template',
  // Template events are mode-agnostic — no Test/Live filter.
  inputFields: scopeFields.withoutMode,
  performList: listTemplates('template.created'),
})
