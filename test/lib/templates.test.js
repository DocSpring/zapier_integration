'use strict'

const { jsonSchemaToZapierFields } = require('../../lib/templates')

describe('jsonSchemaToZapierFields', () => {
  const schema = {
    type: 'object',
    properties: {
      full_name: { type: 'string', description: 'Customer name' },
      age: { type: 'integer' },
      premium: { type: 'boolean' },
      signed_on: { type: 'string', format: 'date-time' },
      plan: { type: 'string', enum: ['basic', 'pro'] },
      tags: { type: 'array', items: { type: 'string' } },
      address: { type: 'object', properties: { city: { type: 'string' } } },
    },
    required: ['full_name', 'plan'],
  }

  const fields = jsonSchemaToZapierFields(schema)
  const byKey = Object.fromEntries(fields.map((f) => [f.key, f]))

  it('namespaces every key with data__', () => {
    fields.forEach((f) => expect(f.key.startsWith('data__')).toBe(true))
  })

  it('maps scalar types and humanizes labels', () => {
    expect(byKey.data__full_name.type).toBe('string')
    expect(byKey.data__full_name.label).toBe('Full Name')
    expect(byKey.data__age.type).toBe('integer')
    expect(byKey.data__premium.type).toBe('boolean')
    expect(byKey.data__signed_on.type).toBe('datetime')
  })

  it('marks required fields from the schema required[] set', () => {
    expect(byKey.data__full_name.required).toBe(true)
    expect(byKey.data__plan.required).toBe(true)
    expect(byKey.data__age.required).toBe(false)
  })

  it('maps enum to choices', () => {
    expect(byKey.data__plan.choices).toEqual(['basic', 'pro'])
  })

  it('maps array-of-scalars to a list field', () => {
    expect(byKey.data__tags.list).toBe(true)
    expect(byKey.data__tags.type).toBe('string')
  })

  it('falls back to a dict for nested objects', () => {
    expect(byKey.data__address.dict).toBe(true)
  })

  it('carries through descriptions as helpText', () => {
    expect(byKey.data__full_name.helpText).toBe('Customer name')
  })

  it('returns an empty array for an empty/missing schema', () => {
    expect(jsonSchemaToZapierFields(undefined)).toEqual([])
    expect(jsonSchemaToZapierFields({})).toEqual([])
  })
})
