'use strict'

const { API_PREFIX, DATA_FIELD_PREFIX } = require('./constants')
const { prettyLabel } = require('./util')

// Map a JSON Schema (draft-04) property to a Zapier input field type.
function mapScalarType(prop) {
  const type = Array.isArray(prop.type)
    ? prop.type.find((t) => t !== 'null')
    : prop.type
  switch (type) {
    case 'integer':
      return 'integer'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'string':
      if (prop.format === 'date-time' || prop.format === 'date')
        return 'datetime'
      return 'string'
    default:
      return 'string'
  }
}

function baseType(prop) {
  return Array.isArray(prop.type)
    ? prop.type.find((t) => t !== 'null')
    : prop.type
}

// Pure transform: a template's field schema (GET /templates/{id}/schema) →
// Zapier input fields. Keys are namespaced with `data__` so a template field
// named `test`/`metadata`/`version`/etc. can't collide with a control input.
//
// Nested objects / arrays-of-objects can't map to a flat Zapier field, so they
// fall back to a JSON dict input (documented v1 limitation).
function jsonSchemaToZapierFields(schema, { optional = false } = {}) {
  const safe = schema || {}
  const props = safe.properties || {}
  const required = new Set(safe.required || [])

  return Object.keys(props).map((name) => {
    const prop = props[name] || {}
    const type = baseType(prop)
    const field = {
      key: `${DATA_FIELD_PREFIX}${name}`,
      label: prettyLabel(name),
      // `optional` forces every field non-required — used by Create Data
      // Request, where the recipient fills in whatever the sender left blank.
      required: optional ? false : required.has(name),
    }
    if (prop.description) field.helpText = prop.description

    if (type === 'object') {
      field.dict = true
    } else if (type === 'array') {
      const items = prop.items || {}
      if (baseType(items) === 'object') {
        field.dict = true
      } else {
        field.type = mapScalarType(items)
        field.list = true
      }
    } else {
      field.type = mapScalarType(prop)
      if (Array.isArray(prop.enum)) {
        field.choices = prop.enum.map((value) => String(value))
      }
    }
    return field
  })
}

// The Template input itself: a dynamic dropdown (sourced from the hidden
// list_templates trigger) with search support. `altersDynamicFields` makes
// Zapier refresh the per-template fields when the selection changes.
const templateDropdown = {
  key: 'template_id',
  label: 'Template',
  type: 'string',
  required: true,
  dynamic: 'list_templates.id.name',
  search: 'find_template.id',
  altersDynamicFields: true,
  helpText: 'The template to fill out. Choosing one reveals its fields below.',
}

// Control inputs (always present, independent of the selected template).
const controlFields = [
  {
    key: 'test',
    label: 'Test PDF?',
    type: 'boolean',
    required: false,
    default: 'false',
    helpText:
      'Test PDFs are free but include a watermark. Live PDFs have no watermark and count toward your usage.',
  },
  {
    key: 'metadata',
    label: 'Metadata',
    dict: true,
    required: false,
    helpText:
      'Custom metadata to store with the submission (not used to fill the PDF; included in webhooks).',
  },
  {
    // Neither key nor label may contain "password" — that trips Zapier's
    // credential check (D001), which is meant for auth fields. Mapped back to
    // the API's `password` param in the create's perform.
    key: 'pdf_passphrase',
    label: 'Encrypt PDF With Passphrase',
    type: 'string',
    required: false,
    helpText: 'Password used to encrypt and open the generated PDF.',
  },
  {
    key: 'expires_in',
    label: 'Expires In (seconds)',
    type: 'integer',
    required: false,
    helpText: 'Seconds until the submission data and PDF are deleted.',
  },
  {
    key: 'editable',
    label: 'Editable',
    type: 'boolean',
    required: false,
    helpText: 'Allow the generated PDF form fields to remain editable.',
  },
  {
    key: 'version',
    label: 'Template Version',
    type: 'string',
    required: false,
    helpText:
      'Use a specific published template version, or "draft". Defaults to the latest published version.',
  },
]

// inputFields function returning ONLY the selected template's own fields
// (fetched on demand). The template dropdown + control fields are declared
// statically alongside this in the create, so the form renders immediately and
// the create isn't flagged as "only dynamic fields" (D022).
async function templateSchemaFields(z, bundle) {
  const templateId = bundle.inputData && bundle.inputData.template_id
  if (!templateId) return []

  const response = await z.request({
    url: `${API_PREFIX}/templates/${templateId}/schema`,
  })
  return jsonSchemaToZapierFields(response.data)
}

// Same as templateSchemaFields, but every field is optional. Used by Create
// Data Request: the sender may pre-fill some fields, and the recipient fills in
// the rest, so no template field should be forced on the Zap author.
async function templateSchemaFieldsOptional(z, bundle) {
  const templateId = bundle.inputData && bundle.inputData.template_id
  if (!templateId) return []

  const response = await z.request({
    url: `${API_PREFIX}/templates/${templateId}/schema`,
  })
  return jsonSchemaToZapierFields(response.data, { optional: true })
}

// Shared template list for the Find Template search.
async function performListTemplates(z, bundle) {
  const response = await z.request({
    url: `${API_PREFIX}/templates`,
    params: {
      query: (bundle.inputData && bundle.inputData.query) || undefined,
      per_page: 100,
    },
  })
  return Array.isArray(response.data) ? response.data : []
}

module.exports = {
  jsonSchemaToZapierFields,
  templateSchemaFields,
  templateSchemaFieldsOptional,
  performListTemplates,
  templateDropdown,
  controlFields,
}
