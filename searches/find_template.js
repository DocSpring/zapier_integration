'use strict'

const { performListTemplates } = require('../lib/templates')
const {
  resourceCreateFields,
  resourceCreateSample,
} = require('../lib/resources')

// Returns matching templates. Also used as the `search` source for the Template
// dropdown on Generate PDF (`search: 'find_template.id'`).
const perform = async (z, bundle) => performListTemplates(z, bundle)

module.exports = {
  key: 'find_template',
  noun: 'Template',
  display: {
    label: 'Find Template',
    description: 'Find a template by name or ID.',
  },
  operation: {
    inputFields: [
      {
        key: 'query',
        label: 'Name or ID',
        type: 'string',
        required: false,
        helpText:
          'Search templates by name or ID. Leave blank to list recent templates.',
      },
    ],
    perform,
    outputFields: resourceCreateFields('template'),
    sample: resourceCreateSample('template'),
  },
}
