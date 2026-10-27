'use strict'

const {
  DATA_FIELD_PREFIX,
  DATA_JSON_FIELD_PREFIX,
  DATA_IMAGE_FIELD_PREFIX,
} = require('./constants')
const { apiPath } = require('./api')
const { isBlank, parseJson, prettyLabel, seg, text } = require('./util')

// Building Zapier inputs from a template's JSON Schema
// (GET /templates/{template_id}/schema?version=), and turning those inputs
// back into a submission's `data`.

function baseType(prop) {
  return Array.isArray(prop.type)
    ? prop.type.find((t) => t !== 'null')
    : prop.type
}

// Image, signature and initials fields are a `oneOf` of {url}, {base64} (and
// {text} for signatures), with no `type` of their own.
function isImageField(prop) {
  return (
    Array.isArray(prop.oneOf) &&
    prop.oneOf.some(
      (option) => option && option.properties && option.properties.url
    )
  )
}

function isSignatureField(prop) {
  return ['signature', 'initials'].includes(prop['x-input-type'])
}

function isScalarSchema(prop) {
  return ['string', 'number', 'integer', 'boolean'].includes(
    baseType(prop || {})
  )
}

function scalarFieldType(prop) {
  switch (baseType(prop)) {
    case 'integer':
      return 'integer'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'string':
      // API v2 takes dates as YYYY-MM-DD, so a date field is a text input
      // (a Zapier date input would send a date and time).
      if (prop.format === 'date-time') return 'datetime'
      return prop['x-input-type'] === 'textarea' ? 'text' : 'string'
    default:
      return 'string'
  }
}

function withHelp(field, ...parts) {
  const help = parts.filter(Boolean).join(' ')
  if (help) field.helpText = help.slice(0, 1000)
  return field
}

// A template's data schema → Zapier input fields.
//   optional:        make every field optional (Check Data, Create Signature
//                    Request, where the API or the signers check them)
//   skipSignatures:  leave out signature and initials fields (only signers
//                    can fill them in)
function jsonSchemaToZapierFields(
  schema,
  { optional = false, skipSignatures = false } = {}
) {
  const safe = schema || {}
  const props = safe.properties || {}
  const required = new Set(safe.required || [])

  return Object.keys(props)
    .filter((name) => !(skipSignatures && isSignatureField(props[name] || {})))
    .map((name) => {
      const prop = props[name] || {}
      const type = baseType(prop)
      const label = prop.title || prettyLabel(name)
      const isRequired = optional ? false : required.has(name)
      const description = prop.description

      if (isImageField(prop)) {
        return withHelp(
          {
            key: `${DATA_IMAGE_FIELD_PREFIX}${name}`,
            label,
            type: 'string',
            required: isRequired,
          },
          description,
          'The URL of the image. (Or JSON such as `{"base64": "..."}`.)'
        )
      }

      if (type === 'object') {
        const values = Object.values(prop.properties || {})
        if (values.length > 0 && values.every(isScalarSchema)) {
          return withHelp(
            {
              key: `${DATA_FIELD_PREFIX}${name}`,
              label,
              dict: true,
              required: isRequired,
            },
            description
          )
        }
        return withHelp(
          {
            key: `${DATA_JSON_FIELD_PREFIX}${name}`,
            label,
            type: 'code',
            required: isRequired,
          },
          description,
          'JSON object.'
        )
      }

      if (type === 'array') {
        const items = prop.items || {}
        if (isScalarSchema(items)) {
          return withHelp(
            {
              key: `${DATA_FIELD_PREFIX}${name}`,
              label,
              type: scalarFieldType(items),
              list: true,
              required: isRequired,
            },
            description
          )
        }
        return withHelp(
          {
            key: `${DATA_JSON_FIELD_PREFIX}${name}`,
            label,
            type: 'code',
            required: isRequired,
          },
          description,
          'JSON list, such as `[{"name": "..."}]`.'
        )
      }

      const field = {
        key: `${DATA_FIELD_PREFIX}${name}`,
        label,
        type: scalarFieldType(prop),
        required: isRequired,
      }
      if (Array.isArray(prop.enum)) {
        field.choices = prop.enum
          .filter((v) => v !== null)
          .map((v) => String(v))
      }
      return withHelp(
        field,
        description,
        prop.format === 'date'
          ? 'A date as YYYY-MM-DD, such as 2026-10-27.'
          : undefined
      )
    })
}

// Rebuild `data` from the Data (JSON) input and the namespaced template-field
// inputs. Values are passed as the user mapped them (API v2 checks them
// against the template); blanks are left out. A template field with a value
// wins over the same key in Data (JSON).
function dataFromInputs(z, input) {
  const data = { ...(parseJson(z, input.json_data, 'Data (JSON)') || {}) }
  Object.keys(input).forEach((key) => {
    const value = input[key]
    if (isBlank(value)) return
    if (key.startsWith(DATA_FIELD_PREFIX)) {
      data[key.slice(DATA_FIELD_PREFIX.length)] = value
    } else if (key.startsWith(DATA_JSON_FIELD_PREFIX)) {
      const name = key.slice(DATA_JSON_FIELD_PREFIX.length)
      const parsed =
        typeof value === 'string' ? parseAnyJson(z, value, name) : value
      data[name] = parsed
    } else if (key.startsWith(DATA_IMAGE_FIELD_PREFIX)) {
      const name = key.slice(DATA_IMAGE_FIELD_PREFIX.length)
      const raw = String(value).trim()
      data[name] = raw.startsWith('{') ? parseJson(z, raw, name) : { url: raw }
    }
  })
  return data
}

function parseAnyJson(z, value, label) {
  try {
    return JSON.parse(value)
  } catch (e) {
    throw new z.errors.Error(
      `${label} must be valid JSON: ${e.message}`,
      'InvalidInput',
      400
    )
  }
}

// ---- Shared inputs ----

// The Template input, for operations whose other inputs don't depend on it.
const templateInput = {
  key: 'template_id',
  label: 'Template',
  type: 'string',
  required: true,
  dynamic: 'template_choices.id.label',
  search: 'find_templates.id',
}

// The Template input for operations that show the template's own fields.
const templateDropdown = { ...templateInput, altersDynamicFields: true }

// A Folder input (a dropdown, or a folder ID).
const folderInput = (overrides) => ({
  key: 'parent_folder_id',
  label: 'Folder',
  type: 'string',
  required: false,
  dynamic: 'folder_choices.id.label',
  ...overrides,
})

const templateVersionInput = {
  key: 'version',
  label: 'Template Version',
  type: 'string',
  required: false,
  altersDynamicFields: true,
  helpText:
    'A published version (`1.2.0`, or `1` for the latest 1.x.x), `latest` or `draft`. ' +
    'Leave blank for the latest published version (the draft when none has been published).',
}

const testInput = {
  key: 'test',
  label: 'Test PDF?',
  type: 'boolean',
  required: false,
  default: 'false',
  helpText:
    'Test PDFs are free and have a watermark. Live PDFs use credits. A test API token always makes test PDFs.',
}

const metadataInput = {
  key: 'metadata',
  label: 'Metadata',
  dict: true,
  required: false,
  helpText:
    "Your own data to store with the record, such as an ID from your app. It isn't printed on the PDF.",
}

// Neither key nor label may contain "password" (Zapier check D001 treats it
// as a credential); perform sends it as the API's `password`.
const pdfPassphraseInput = {
  key: 'pdf_passphrase',
  label: 'Encrypt PDF With Passphrase',
  type: 'string',
  required: false,
  helpText:
    'People need this passphrase to open the PDF. DocSpring never returns it.',
}

const expiresInInput = {
  key: 'expires_in',
  label: 'Expires In (seconds)',
  type: 'integer',
  required: false,
  helpText:
    'Seconds after the PDF is generated until it expires and its data and PDF are deleted (up to 315360000, 10 years).',
}

const waitInput = (what) => ({
  key: 'wait',
  label: `Wait for the ${what}?`,
  type: 'boolean',
  required: false,
  default: 'true',
  helpText:
    `Yes: wait up to 25 seconds for the ${what} (Zapier stops an action after 30 seconds); ` +
    "if it isn't ready by then, the error gives its ID. No: return straight away, while it's still pending.",
})

// Whether a template ID is mapped from an earlier step. In the Zap editor it
// is then the field reference (`{{123__id}}`), not an ID, so there are no
// template fields to show: its data goes in Data (JSON).
function isMappedValue(value) {
  return String(value == null ? '' : value).includes('{{')
}

// Data (JSON): a template's data as a JSON object, for a template mapped from
// an earlier step (whose fields can't be shown) or fields not listed.
const dataJsonInput = (overrides) => ({
  key: 'json_data',
  label: 'Data (JSON)',
  type: 'code',
  required: false,
  helpText:
    'The values of the template\'s fields as a JSON object, such as `{"first_name": "Jane"}`. ' +
    "Use it when the template comes from an earlier step, so its fields aren't listed here. " +
    'A template field with a value wins over the same name here.',
  ...overrides,
})

// The selected template's own fields, fetched for the chosen version.
async function fetchTemplateSchema(z, bundle) {
  const input = bundle.inputData || {}
  const templateId = text(input.template_id)
  if (!templateId || isMappedValue(templateId)) return undefined
  const response = await z.request({
    url: apiPath('templates', seg(templateId), 'schema'),
    params: { version: text(input.version) },
    removeMissingValuesFrom: { params: true },
  })
  return response.data
}

function templateSchemaFields(options = {}) {
  return async (z, bundle) => {
    const schema = await fetchTemplateSchema(z, bundle)
    return schema ? jsonSchemaToZapierFields(schema, options) : []
  }
}

// The template's field list (GET /templates/{template_id}/fields?version=).
// Without a version, the API lists the draft's fields.
async function fetchTemplateFields(z, templateId, version) {
  const id = text(templateId)
  if (!id || isMappedValue(id)) return []
  const response = await z.request({
    url: apiPath('templates', seg(id), 'fields'),
    params: { version: text(version) },
    removeMissingValuesFrom: { params: true },
  })
  return (response.data && response.data.fields) || []
}

// The names a signer can be given to fill in: each name once, in the API's
// order, without static fields, `combined` fields or `@@` submission details,
// which take no value.
function signerFieldNames(fields) {
  const names = []
  ;(fields || []).forEach((field) => {
    const name = field && field.name
    if (
      !name ||
      field.static ||
      field.type === 'combined' ||
      name.startsWith('@@') ||
      names.includes(name)
    ) {
      return
    }
    names.push(name)
  })
  return names
}

module.exports = {
  jsonSchemaToZapierFields,
  dataFromInputs,
  templateSchemaFields,
  fetchTemplateFields,
  signerFieldNames,
  isMappedValue,
  dataJsonInput,
  templateInput,
  templateDropdown,
  folderInput,
  templateVersionInput,
  testInput,
  metadataInput,
  pdfPassphraseInput,
  expiresInInput,
  waitInput,
}
