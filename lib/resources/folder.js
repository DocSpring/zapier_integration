'use strict'

// Folder webhook payload (app/serializers/folder_serializer.rb).
module.exports = {
  type: 'Folder',
  outputFields: [
    { key: 'name', label: 'Name', type: 'string' },
    { key: 'path', label: 'Path', type: 'string' },
    { key: 'parent_folder_id', label: 'Parent Folder ID', type: 'string' },
  ],
  sample: {
    resource_id: 'fld_000000000000000001',
    name: 'Invoices',
    path: '/Invoices',
    parent_folder_id: null,
  },
}
