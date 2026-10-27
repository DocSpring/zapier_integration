'use strict'

const { apiPath } = require('../lib/api')
const { pagedDropdown } = require('../lib/dropdowns')

// Hidden trigger behind every Folder dropdown
// (`dynamic: 'folder_choices.id.label'`). A folder's `path` is the path of
// the folder it's in, so the label is the folder's own full path.
const toChoice = (folder) => {
  const parent = !folder.path || folder.path === '/' ? '' : folder.path
  return { id: folder.id, label: `${parent}/${folder.name}`, name: folder.name }
}

module.exports = {
  key: 'folder_choices',
  noun: 'Folder',
  display: {
    label: 'Folder Choices',
    description: 'Lists folders for the Folder dropdowns.',
    hidden: true,
  },
  operation: {
    canPaginate: true,
    perform: pagedDropdown(apiPath('folders'), toChoice),
    sample: {
      id: 'fld_1234567890abcdef01',
      label: '/Contracts',
      name: 'Contracts',
    },
    outputFields: [
      { key: 'id', label: 'Folder ID' },
      { key: 'label', label: 'Path' },
      { key: 'name', label: 'Name' },
    ],
  },
}
