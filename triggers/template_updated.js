'use strict'

const { makeHookTrigger } = require('../lib/hooks')
const { listTemplates } = require('../lib/performLists')
const scopeFields = require('../lib/scopeFields')

module.exports = makeHookTrigger({
  key: 'template_updated',
  noun: 'Template',
  label: 'Template Updated',
  description:
    'Triggers when a template is updated (e.g. fields or settings change).',
  eventType: 'template.updated',
  resource: 'template',
  inputFields: scopeFields.withoutMode,
  performList: listTemplates('template.updated'),
})
