'use strict'

const { apiPath, apiRequest } = require('../lib/api')
const { asArray, parseJson, seg, text, toInteger } = require('../lib/util')
const {
  templateInput,
  templateDropdown,
  fetchTemplateFields,
} = require('../lib/templates')
const { templateFields } = require('../lib/resources/other')

// Add, Update and Remove Template Fields. Adding and updating take the fields
// as JSON (an advanced input): each field has dozens of settings, documented
// with the API's addTemplateFields and updateTemplateFields operations.

const fieldsJsonInput = (helpText) => ({
  key: 'fields',
  label: 'Fields (JSON)',
  type: 'code',
  required: true,
  helpText,
})

const sendFields = (method) => async (z, bundle) => {
  const input = bundle.inputData || {}
  const response = await apiRequest(z, {
    url: apiPath('templates', seg(input.template_id), 'fields'),
    method,
    body: { fields: parseJson(z, input.fields, 'Fields', 'array') },
  })
  return response.data
}

const addTemplateFields = {
  key: 'add_template_fields',
  noun: 'Template Fields',
  display: {
    label: 'Add Template Fields',
    description: "Adds fields to a template's draft.",
  },
  operation: {
    inputFields: [
      templateInput,
      fieldsJsonInput(
        'A JSON list of fields, such as `[{"name": "first_name", "type": "string", "page": 1, "x": 72, "y": 100, ' +
          '"width": 200, "height": 20}]`. Settings left out have their defaults.'
      ),
    ],
    perform: sendFields('POST'),
    outputFields: templateFields.outputFields,
    sample: templateFields.sample,
  },
}

const updateTemplateFields = {
  key: 'update_template_fields',
  noun: 'Template Fields',
  display: {
    label: 'Update Template Fields',
    description: "Changes the settings of fields in a template's draft.",
  },
  operation: {
    inputFields: [
      templateInput,
      fieldsJsonInput(
        'A JSON list of changes, each with the `id` of the field it changes, such as ' +
          '`[{"id": 1, "required": false}]`. Settings left out keep their values. Get the IDs with List Template Fields.'
      ),
    ],
    perform: sendFields('PUT'),
    outputFields: templateFields.outputFields,
    sample: templateFields.sample,
  },
}

// The Field IDs input lists the template's fields once a template is chosen:
// the draft's, since that's what fields are removed from.
async function fieldIdChoices(z, bundle) {
  const fields = await fetchTemplateFields(
    z,
    (bundle.inputData || {}).template_id
  )
  const choices = fields.map((field) => ({
    value: String(field.id),
    sample: String(field.id),
    label: `${field.name || '(no name)'} (page ${field.page}, ID ${field.id})`,
  }))
  return [
    {
      key: 'field_ids',
      label: 'Fields',
      type: 'integer',
      list: true,
      required: true,
      ...(choices.length ? { choices } : {}),
      helpText:
        'The fields to remove, or their IDs (from List Template Fields).',
    },
  ]
}

const removeTemplateFields = {
  key: 'remove_template_fields',
  noun: 'Template Fields',
  display: {
    label: 'Remove Template Fields',
    description: "Removes fields from a template's draft.",
  },
  operation: {
    inputFields: [templateDropdown, fieldIdChoices],
    perform: async (z, bundle) => {
      const input = bundle.inputData || {}
      const ids = asArray(input.field_ids).map((id) =>
        toInteger(z, id, 'Field ID')
      )
      if (ids.length === 0) {
        throw new z.errors.Error(
          'Choose at least one field to remove.',
          'InvalidInput',
          400
        )
      }
      const response = await apiRequest(z, {
        url: apiPath(
          'templates',
          seg(text(input.template_id)),
          'fields',
          'remove'
        ),
        method: 'POST',
        body: { field_ids: ids },
      })
      return response.data
    },
    outputFields: templateFields.outputFields,
    sample: templateFields.sample,
  },
}

module.exports = {
  addTemplateFields,
  updateTemplateFields,
  removeTemplateFields,
}
