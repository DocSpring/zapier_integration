'use strict'

const { MAX_DROPDOWN_ITEMS, PAGE_SIZE } = require('../lib/constants')
const { apiPath, listPage } = require('../lib/api')
const { isRoot } = require('../lib/documents')
const { compact, text } = require('../lib/util')
const { folderInput } = require('../lib/templates')
const { folder } = require('../lib/resources/other')

// List Folders: the folders in a folder (or every folder), newest first. With
// a Name, only folders with that name (ignoring case), looking through up to
// 1,000 folders. Zapier uses the first result, which also makes this the
// search for "Find or Create Folder".
const perform = async (z, bundle) => {
  const input = bundle.inputData || {}
  const name = text(input.name)
  const rootOnly = isRoot(input.parent_folder_id)
  const parent = rootOnly ? undefined : text(input.parent_folder_id)
  const keep = (item) =>
    (!name || String(item.name).toLowerCase() === name.toLowerCase()) &&
    (!rootOnly || !item.parent_folder_id)

  // Without a filter, the first page is the result; with one, look through
  // up to 1,000 folders.
  const filtering = !!name || rootOnly
  const matches = []
  let cursor
  let seen = 0
  do {
    const { items, nextCursor } = await listPage(
      z,
      apiPath('folders'),
      compact({ parent_folder_id: parent, limit: PAGE_SIZE, cursor })
    )
    seen += items.length
    matches.push(...items.filter(keep))
    cursor = nextCursor
  } while (filtering && cursor && seen < MAX_DROPDOWN_ITEMS)
  return matches
}

module.exports = {
  key: 'list_folders',
  noun: 'Folder',
  display: {
    label: 'List Folders',
    description: 'Lists folders, or finds a folder by name.',
  },
  operation: {
    inputFields: [
      {
        key: 'name',
        label: 'Name',
        type: 'string',
        required: false,
        helpText:
          'Only folders with this name (ignoring case). Leave blank to list them.',
      },
      folderInput({
        label: 'Parent Folder',
        helpText:
          'Only folders in this folder. Enter `root` for the top level; leave blank for folders at any level.',
      }),
    ],
    perform,
    outputFields: folder.outputFields,
    sample: folder.sample,
  },
}
