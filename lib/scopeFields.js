'use strict'

// Shared scoping inputs for REST-hook triggers. All optional — leaving them
// blank subscribes to the event across the whole account. They map to the
// webhook scope params (app/models/webhook.rb): template_uids / folder_uids
// (OR-combined) and mode (test/live).
const TEMPLATE_SCOPE = {
  key: 'template_uids',
  label: 'Templates',
  type: 'string',
  list: true,
  required: false,
  dynamic: 'list_templates.id.name',
  helpText: 'Only trigger for these templates. Leave blank for all templates.',
}

const FOLDER_SCOPE = {
  key: 'folder_uids',
  label: 'Folders',
  type: 'string',
  list: true,
  required: false,
  dynamic: 'list_folders.id.name',
  helpText:
    'Only trigger for templates/submissions in these folders. Leave blank for all.',
}

const MODE = {
  key: 'mode',
  label: 'Mode',
  type: 'string',
  required: false,
  choices: [
    { value: 'live', sample: 'live', label: 'Live only' },
    { value: 'test', sample: 'test', label: 'Test only' },
  ],
  helpText: 'Limit to Live or Test submissions. Leave blank for both.',
}

// `standard` is used by submission/data-request triggers (which carry a real
// test/live mode and are template/folder scopable). `withoutMode` is used by
// template/folder config triggers, which are mode-agnostic on the server, so a
// Mode field would mislead. `modeOnly` is used by combined-submission and batch
// triggers: those events can never match template/folder filters (see
// Webhook::TEMPLATE_SCOPABLE_RESOURCES in the Rails app — subscribing with one
// set returns a validation error), so only Mode is offered.
module.exports = {
  standard: [TEMPLATE_SCOPE, FOLDER_SCOPE, MODE],
  withoutMode: [TEMPLATE_SCOPE, FOLDER_SCOPE],
  modeOnly: [MODE],
}
