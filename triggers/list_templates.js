'use strict'

const { API_PREFIX } = require('../lib/constants')

// Hidden polling trigger that powers the Template dropdown
// (`dynamic: 'list_templates.id.name'`) and the Find Template search source.
// The /templates list returns a bare array, paginated by page/per_page.
const perform = async (z, bundle) => {
  const page = ((bundle.meta && bundle.meta.page) || 0) + 1
  const response = await z.request({
    url: `${API_PREFIX}/templates`,
    params: {
      page,
      per_page: 100,
      query: (bundle.inputData && bundle.inputData.query) || undefined,
    },
  })
  return Array.isArray(response.data) ? response.data : []
}

module.exports = {
  key: 'list_templates',
  noun: 'Template',
  display: {
    label: 'List Templates',
    description: 'Internal trigger used to populate the Template dropdown.',
    hidden: true,
  },
  operation: {
    canPaginate: true,
    perform,
    sample: { id: 'tpl_000000000000000001', name: 'Invoice Template' },
    outputFields: [
      { key: 'id', label: 'Template ID' },
      { key: 'name', label: 'Name' },
    ],
  },
}
