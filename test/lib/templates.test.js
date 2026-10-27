'use strict'

const {
  jsonSchemaToZapierFields,
  dataFromInputs,
} = require('../../lib/templates')

const z = {
  errors: {
    Error: class ZapierError extends Error {},
  },
}

// A schema as GET /api/v2/templates/{template_id}/schema returns it.
const schema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    full_name: {
      type: 'string',
      title: 'Full Name',
      description: 'Customer name',
    },
    age: { type: ['integer', 'null'] },
    premium: { type: 'boolean' },
    signed_on: { type: 'string', format: 'date' },
    signed_at: { type: 'string', format: 'date-time' },
    plan: { type: 'string', enum: ['basic', 'pro'] },
    notes: { type: 'string', 'x-input-type': 'textarea' },
    tags: { type: 'array', items: { type: 'string' } },
    address: {
      type: 'object',
      properties: { city: { type: 'string' }, zip: { type: 'string' } },
    },
    items: {
      type: 'array',
      items: { type: 'object', properties: { price: { type: 'number' } } },
    },
    logo: {
      oneOf: [
        {
          type: 'object',
          required: ['base64'],
          properties: { base64: { type: 'string' } },
        },
        {
          type: 'object',
          required: ['url'],
          properties: { url: { type: 'string', format: 'url' } },
        },
        { type: 'null' },
      ],
    },
    signature: {
      'x-input-type': 'signature',
      oneOf: [
        { type: 'object', properties: { base64: { type: 'string' } } },
        { type: 'object', properties: { url: { type: 'string' } } },
        { type: 'object', properties: { text: { type: 'object' } } },
      ],
    },
  },
  required: ['full_name', 'plan', 'signature'],
}

describe('jsonSchemaToZapierFields', () => {
  const fields = jsonSchemaToZapierFields(schema)
  const byKey = Object.fromEntries(fields.map((f) => [f.key, f]))

  it('namespaces each key by how perform sends its value', () => {
    expect(Object.keys(byKey).sort()).toEqual(
      [
        'data__full_name',
        'data__age',
        'data__premium',
        'data__signed_on',
        'data__signed_at',
        'data__plan',
        'data__notes',
        'data__tags',
        'data__address',
        'data_json__items',
        'data_image__logo',
        'data_image__signature',
      ].sort()
    )
  })

  it("maps scalar types and uses the schema's titles", () => {
    expect(byKey.data__full_name.type).toBe('string')
    expect(byKey.data__full_name.label).toBe('Full Name')
    expect(byKey.data__age.type).toBe('integer')
    expect(byKey.data__age.label).toBe('Age')
    expect(byKey.data__premium.type).toBe('boolean')
    expect(byKey.data__signed_at.type).toBe('datetime')
    expect(byKey.data__notes.type).toBe('text')
  })

  it('makes a date field a text input that asks for YYYY-MM-DD', () => {
    expect(byKey.data__signed_on.type).toBe('string')
    expect(byKey.data__signed_on.helpText).toMatch(/YYYY-MM-DD/)
  })

  it('marks required fields from the schema', () => {
    expect(byKey.data__full_name.required).toBe(true)
    expect(byKey.data__age.required).toBe(false)
  })

  it('maps enums to choices, lists of scalars to list inputs, flat objects to dicts', () => {
    expect(byKey.data__plan.choices).toEqual(['basic', 'pro'])
    expect(byKey.data__tags).toMatchObject({ type: 'string', list: true })
    expect(byKey.data__address.dict).toBe(true)
    expect(byKey.data_json__items.type).toBe('code')
  })

  it('carries descriptions through as help text', () => {
    expect(byKey.data__full_name.helpText).toBe('Customer name')
  })

  it('makes every field optional, and can leave out signature fields', () => {
    const optional = jsonSchemaToZapierFields(schema, {
      optional: true,
      skipSignatures: true,
    })
    expect(optional.every((f) => f.required === false)).toBe(true)
    expect(optional.map((f) => f.key)).not.toContain('data_image__signature')
    expect(optional.map((f) => f.key)).toContain('data_image__logo')
  })

  it('returns nothing for an empty schema', () => {
    expect(jsonSchemaToZapierFields(undefined)).toEqual([])
    expect(jsonSchemaToZapierFields({})).toEqual([])
  })
})

describe('dataFromInputs', () => {
  it('rebuilds data from the namespaced inputs, leaving out blanks and control inputs', () => {
    const data = dataFromInputs(z, {
      template_id: 'tpl_1',
      test: true,
      data__full_name: 'Jane',
      data__age: 42,
      data__premium: false,
      data__notes: '',
      data__tags: ['a', 'b'],
      data__address: { city: 'Auckland' },
      data_json__items: '[{"price": 9.5}]',
      data_image__logo: 'https://example.com/logo.png',
      data_image__signature:
        '{"text": {"name": "Jane Doe", "typeface": "Caveat"}}',
    })
    expect(data).toEqual({
      full_name: 'Jane',
      age: 42,
      premium: false,
      tags: ['a', 'b'],
      address: { city: 'Auckland' },
      items: [{ price: 9.5 }],
      logo: { url: 'https://example.com/logo.png' },
      signature: { text: { name: 'Jane Doe', typeface: 'Caveat' } },
    })
  })

  it('reports JSON it cannot read', () => {
    expect(() => dataFromInputs(z, { data_json__items: '[{' })).toThrow(
      /items must be valid JSON/
    )
  })
})
