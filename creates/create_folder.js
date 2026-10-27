'use strict'

const { apiPath, apiRequest } = require('../lib/api')
const { isRoot } = require('../lib/documents')
const { compact, text } = require('../lib/util')
const { folderInput } = require('../lib/templates')
const { folder } = require('../lib/resources/other')

const perform = async (z, bundle) => {
  const input = bundle.inputData || {}
  const response = await apiRequest(z, {
    url: apiPath('folders'),
    method: 'POST',
    body: compact({
      name: text(input.name),
      parent_folder_id: isRoot(input.parent_folder_id)
        ? undefined
        : text(input.parent_folder_id),
    }),
  })
  return response.data
}

module.exports = {
  key: 'create_folder',
  noun: 'Folder',
  display: {
    label: 'Create Folder',
    description: 'Creates a folder for templates.',
  },
  operation: {
    inputFields: [
      {
        key: 'name',
        label: 'Name',
        type: 'string',
        required: true,
        helpText: "The folder's name. It can't contain `/`.",
      },
      folderInput({
        label: 'Parent Folder',
        helpText:
          'The folder to create it in. Leave blank (or enter `root`) for the top level.',
      }),
    ],
    perform,
    outputFields: folder.outputFields,
    sample: folder.sample,
  },
}
