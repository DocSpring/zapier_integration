'use strict'

const { apiPath, apiRequest } = require('../lib/api')
const { compact, seg, text } = require('../lib/util')
const { templateInput } = require('../lib/templates')
const { templateVersion } = require('../lib/resources/other')

const perform = async (z, bundle) => {
  const input = bundle.inputData || {}
  const response = await apiRequest(z, {
    url: apiPath('templates', seg(input.template_id), 'publish_version'),
    method: 'POST',
    body: compact({
      version_type: text(input.version_type) || 'patch',
      description: text(input.description),
    }),
  })
  return response.data
}

module.exports = {
  key: 'publish_template_version',
  noun: 'Template Version',
  display: {
    label: 'Publish Template Version',
    description: "Publishes the template's draft as a new version.",
  },
  operation: {
    inputFields: [
      templateInput,
      {
        key: 'version_type',
        label: 'Version Type',
        type: 'string',
        required: true,
        default: 'patch',
        choices: [
          { value: 'patch', sample: 'patch', label: 'Patch (1.0.0 → 1.0.1)' },
          { value: 'minor', sample: 'minor', label: 'Minor (1.0.0 → 1.1.0)' },
          { value: 'major', sample: 'major', label: 'Major (1.0.0 → 2.0.0)' },
        ],
        helpText: 'Which part of the latest version number to increase.',
      },
      {
        key: 'description',
        label: 'Description',
        type: 'text',
        required: false,
        helpText: 'What changed in this version.',
      },
    ],
    perform,
    outputFields: templateVersion.outputFields,
    sample: templateVersion.sample,
  },
}
