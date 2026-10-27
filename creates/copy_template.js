'use strict'

const { apiPath, apiRequest } = require('../lib/api')
const { isRoot } = require('../lib/documents')
const { compact, seg, text } = require('../lib/util')
const { templateInput, folderInput } = require('../lib/templates')
const template = require('../lib/resources/template')

const perform = async (z, bundle) => {
  const input = bundle.inputData || {}
  // Blank: the copy goes in the template's own folder (left out). `root`:
  // the top level (null).
  const folder = isRoot(input.parent_folder_id)
    ? null
    : text(input.parent_folder_id)
  const response = await apiRequest(z, {
    url: apiPath('templates', seg(input.template_id), 'copy'),
    method: 'POST',
    body: compact({
      name: text(input.name),
      parent_folder_id: folder,
      version: text(input.version),
    }),
  })
  return response.data
}

module.exports = {
  key: 'copy_template',
  noun: 'Template',
  display: {
    label: 'Copy Template',
    description:
      'Copies a template, or one of its published versions, to a new template.',
  },
  operation: {
    inputFields: [
      templateInput,
      {
        key: 'name',
        label: 'Name',
        type: 'string',
        required: false,
        helpText:
          'Default: the template\'s name and a number, such as "Contract (2)".',
      },
      folderInput({
        helpText:
          "The folder for the copy. Leave blank for the template's own folder, or enter `root` for the top level.",
      }),
      {
        key: 'version',
        label: 'Published Version',
        type: 'string',
        required: false,
        helpText:
          'Copy this published version (`1.2.0`, or `1` for the latest 1.x.x) instead of the draft.',
      },
    ],
    perform,
    outputFields: template.fullOutputFields,
    sample: template.fullSample,
  },
}
