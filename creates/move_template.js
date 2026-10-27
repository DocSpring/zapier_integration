'use strict'

const { apiPath, apiRequest } = require('../lib/api')
const { isRoot } = require('../lib/documents')
const { seg, text } = require('../lib/util')
const { templateInput, folderInput } = require('../lib/templates')
const template = require('../lib/resources/template')

const perform = async (z, bundle) => {
  const input = bundle.inputData || {}
  // `parent_folder_id` is required: null (blank or `root`) is the top level.
  const folder = isRoot(input.parent_folder_id)
    ? null
    : text(input.parent_folder_id) || null
  const response = await apiRequest(z, {
    url: apiPath('templates', seg(input.template_id), 'move'),
    method: 'POST',
    body: { parent_folder_id: folder },
  })
  return response.data
}

module.exports = {
  key: 'move_template',
  noun: 'Template',
  display: {
    label: 'Move Template',
    description:
      'Moves a template, with all of its published versions, to another folder.',
  },
  operation: {
    inputFields: [
      templateInput,
      folderInput({
        helpText:
          'The folder to move it to. Leave blank (or enter `root`) for the top level.',
      }),
    ],
    perform,
    outputFields: template.fullOutputFields,
    sample: template.fullSample,
  },
}
