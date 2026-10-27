'use strict'

const { apiPath, listPage } = require('../lib/api')
const { compact, text, toInteger } = require('../lib/util')
const { templateInput } = require('../lib/templates')
const { getById } = require('./submissions')
const template = require('../lib/resources/template')
const { templateFields, templatePageImages } = require('../lib/resources/other')

const versionInput = (helpText) => ({
  key: 'version',
  label: 'Version',
  type: 'string',
  required: false,
  helpText,
})

const TEMPLATE_ID_INPUT = {
  ...templateInput,
  helpText: 'The template, or its ID (`tpl_…`).',
}

const DRAFT_DEFAULT =
  'A published version (`1.2.0`, or `1` for the latest 1.x.x), `latest` or `draft`. Default: the draft.'

// Find Templates: templates whose name contains the text, newest first. Also
// the search behind the Template dropdowns (`search: 'find_templates.id'`).
const findTemplates = {
  key: 'find_templates',
  noun: 'Template',
  display: {
    label: 'Find Templates',
    description: 'Finds templates by name, optionally in one folder.',
  },
  operation: {
    inputFields: [
      {
        key: 'query',
        label: 'Name',
        type: 'string',
        required: false,
        helpText:
          'Templates whose name contains this text (ignoring case). Leave blank for the newest templates.',
      },
      {
        key: 'parent_folder_id',
        label: 'Folder',
        type: 'string',
        required: false,
        dynamic: 'folder_choices.id.label',
        helpText: 'Only templates in this folder (not in its subfolders).',
      },
      {
        key: 'limit',
        label: 'Limit',
        type: 'integer',
        required: false,
        helpText: 'How many templates to return, from 1 to 100. Default: 10.',
      },
    ],
    perform: async (z, bundle) => {
      const input = bundle.inputData || {}
      const { items } = await listPage(
        z,
        apiPath('templates'),
        compact({
          query: text(input.query),
          parent_folder_id: text(input.parent_folder_id),
          limit: toInteger(z, input.limit, 'Limit') || 10,
        })
      )
      return items
    },
    outputFields: template.outputFields,
    sample: template.sample,
  },
}

const getTemplate = getById({
  key: 'get_template',
  noun: 'Template',
  label: 'Get Template',
  description:
    'Gets a template by its ID, with its settings and published versions.',
  idKey: 'template_id',
  idInput: TEMPLATE_ID_INPUT,
  path: (id) => apiPath('templates', id),
  extraInputs: [versionInput(DRAFT_DEFAULT)],
  params: (z, input) => ({ version: text(input.version) }),
  resource: {
    outputFields: template.fullOutputFields,
    sample: template.fullSample,
  },
})

const listTemplateFields = getById({
  key: 'list_template_fields',
  noun: 'Template Fields',
  label: 'List Template Fields',
  description: "Lists a template's fields, with all their settings.",
  idKey: 'template_id',
  idInput: TEMPLATE_ID_INPUT,
  path: (id) => apiPath('templates', id, 'fields'),
  extraInputs: [versionInput(DRAFT_DEFAULT)],
  params: (z, input) => ({ version: text(input.version) }),
  resource: templateFields,
})

const getTemplatePageImages = getById({
  key: 'get_template_page_images',
  noun: 'Template Page Images',
  label: 'Get Template Page Images',
  description: "Gets a JPEG image of each page of a PDF template's PDF.",
  idKey: 'template_id',
  idInput: TEMPLATE_ID_INPUT,
  path: (id) => apiPath('templates', id, 'page_images'),
  extraInputs: [versionInput(DRAFT_DEFAULT)],
  params: (z, input) => ({ version: text(input.version) }),
  resource: templatePageImages,
})

module.exports = {
  findTemplates,
  getTemplate,
  listTemplateFields,
  getTemplatePageImages,
}
