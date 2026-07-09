'use strict'

const { makeHookTrigger } = require('../lib/hooks')
const { listTemplates } = require('../lib/performLists')
const scopeFields = require('../lib/scopeFields')

module.exports = makeHookTrigger({
  key: 'template_deleted',
  noun: 'Template',
  label: 'Template Deleted',
  description: 'Triggers when a template is deleted from your account.',
  eventType: 'template.deleted',
  resource: 'template',
  inputFields: scopeFields.withoutMode,
  // No "recently deleted templates" endpoint exists, so the test step shows
  // current templates shaped as delivery events (the field shape is identical —
  // deleted events deliver a snapshot captured just before the delete).
  performList: listTemplates('template.deleted'),
})
