'use strict'

const { API_PREFIX } = require('../lib/constants')

// Hidden polling trigger that powers the Folder dropdown
// (`dynamic: 'list_folders.id.name'`). The /folders list returns a bare array.
const perform = async (z) => {
  const response = await z.request({ url: `${API_PREFIX}/folders/` })
  return Array.isArray(response.data) ? response.data : []
}

module.exports = {
  key: 'list_folders',
  noun: 'Folder',
  display: {
    label: 'List Folders',
    description: 'Internal trigger used to populate the Folder dropdown.',
    hidden: true,
  },
  operation: {
    perform,
    sample: {
      id: 'fld_000000000000000001',
      name: 'Invoices',
      path: '/Invoices',
    },
    outputFields: [
      { key: 'id', label: 'Folder ID' },
      { key: 'name', label: 'Name' },
      { key: 'path', label: 'Path' },
    ],
  },
}
