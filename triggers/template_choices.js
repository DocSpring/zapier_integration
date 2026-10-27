'use strict'

const { apiPath } = require('../lib/api')
const { pagedDropdown } = require('../lib/dropdowns')

// Hidden trigger behind every Template dropdown
// (`dynamic: 'template_choices.id.label'`). The label shows the template's
// folder so two templates with the same name can be told apart.
const toChoice = (template) => {
  const name = template.name || template.id
  const label =
    template.path && template.path !== '/' ? `${name} (${template.path})` : name
  return { id: template.id, label, name: template.name, path: template.path }
}

module.exports = {
  key: 'template_choices',
  noun: 'Template',
  display: {
    label: 'Template Choices',
    description: 'Lists templates for the Template dropdowns.',
    hidden: true,
  },
  operation: {
    canPaginate: true,
    perform: pagedDropdown(apiPath('templates'), toChoice),
    sample: {
      id: 'tpl_1234567890abcdef01',
      label: 'Rental Contract (/Contracts)',
      name: 'Rental Contract',
      path: '/Contracts',
    },
    outputFields: [
      { key: 'id', label: 'Template ID' },
      { key: 'label', label: 'Label' },
      { key: 'name', label: 'Name' },
      { key: 'path', label: 'Folder Path' },
    ],
  },
}
