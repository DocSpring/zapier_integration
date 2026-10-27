'use strict'

const { normalizeHost } = require('../../lib/util')

// Guards Zapier check D026: the self-hosted host is spliced into every API
// URL, so only a bare host[:port] (optionally with an http(s) scheme) may pass.
describe('normalizeHost', () => {
  it('returns an empty string for blank input', () => {
    expect(normalizeHost('')).toBe('')
    expect(normalizeHost('   ')).toBe('')
    expect(normalizeHost(undefined)).toBe('')
    expect(normalizeHost(null)).toBe('')
  })

  it('accepts a bare domain and defaults to https', () => {
    expect(normalizeHost('docspring.example.com')).toBe(
      'https://docspring.example.com'
    )
    expect(normalizeHost('  DocSpring.Example.com/ ')).toBe(
      'https://DocSpring.Example.com'
    )
  })

  it('preserves an explicit scheme and port, stripping trailing slashes', () => {
    expect(normalizeHost('http://localhost:3000/')).toBe(
      'http://localhost:3000'
    )
    expect(normalizeHost('https://docspring.example.com:8443//')).toBe(
      'https://docspring.example.com:8443'
    )
    expect(normalizeHost('10.0.0.5:8080')).toBe('https://10.0.0.5:8080')
  })

  it.each([
    'docspring.example.com/api',
    'https://docspring.example.com/v1',
    'https://evil.com/?next=https://api.docspring.com',
    'docspring.example.com#fragment',
    'user:secret@docspring.example.com',
    'ftp://docspring.example.com',
    'docspring example.com',
    'docspring.example.com:99999x',
    '-bad-.example.com',
  ])('rejects %j', (value) => {
    expect(() => normalizeHost(value)).toThrow(/invalid self-hosted host/i)
  })
})

const {
  toBoolean,
  toInteger,
  parseJson,
  splitNames,
  compact,
  isBlank,
} = require('../../lib/util')

const z = {
  errors: {
    Error: class ZapierError extends Error {},
  },
}

describe('toBoolean', () => {
  it('turns the text Zapier may send into real booleans', () => {
    expect(toBoolean(z, true, 'X')).toBe(true)
    expect(toBoolean(z, 'true', 'X')).toBe(true)
    expect(toBoolean(z, 'Yes', 'X')).toBe(true)
    expect(toBoolean(z, 'false', 'X')).toBe(false)
    expect(toBoolean(z, 'no', 'X')).toBe(false)
    expect(toBoolean(z, '0', 'X')).toBe(false)
  })

  it('leaves blanks out', () => {
    expect(toBoolean(z, '', 'X')).toBeUndefined()
    expect(toBoolean(z, null, 'X')).toBeUndefined()
    expect(toBoolean(z, undefined, 'X')).toBeUndefined()
  })

  it("rejects what isn't a yes or no", () => {
    expect(() => toBoolean(z, 'maybe', 'Test PDF?')).toThrow(
      'Test PDF? must be true or false, not "maybe".'
    )
  })
})

describe('toInteger', () => {
  it('turns text into real integers', () => {
    expect(toInteger(z, '3600', 'X')).toBe(3600)
    expect(toInteger(z, 42, 'X')).toBe(42)
    expect(toInteger(z, '', 'X')).toBeUndefined()
  })

  it("rejects what isn't a whole number", () => {
    expect(() => toInteger(z, '1.5', 'Expires In')).toThrow(
      'Expires In must be a whole number, not "1.5".'
    )
    expect(() => toInteger(z, 'soon', 'Expires In')).toThrow(/whole number/)
  })
})

describe('parseJson', () => {
  it('accepts an object (a dict input) or JSON text', () => {
    expect(parseJson(z, { a: '1' }, 'Metadata')).toEqual({ a: '1' })
    expect(parseJson(z, '{"a": 1}', 'Metadata')).toEqual({ a: 1 })
    expect(parseJson(z, '[1]', 'Fields', 'array')).toEqual([1])
    expect(parseJson(z, '', 'Metadata')).toBeUndefined()
    expect(parseJson(z, {}, 'Metadata')).toBeUndefined()
  })

  it('rejects invalid JSON and the wrong kind of value', () => {
    expect(() => parseJson(z, '{nope', 'Metadata')).toThrow(
      /Metadata must be valid JSON/
    )
    expect(() => parseJson(z, '[1]', 'Metadata')).toThrow(
      'Metadata must be a JSON object ({...}).'
    )
    expect(() => parseJson(z, '{"a": 1}', 'Fields', 'array')).toThrow(
      'Fields must be a JSON list ([...]).'
    )
  })
})

describe('splitNames', () => {
  it('splits entries on commas and new lines, trims and dedupes', () => {
    expect(
      splitNames(['first_name, last_name', 'signature\ndate', 'first_name', ''])
    ).toEqual(['first_name', 'last_name', 'signature', 'date'])
    expect(splitNames('')).toEqual([])
  })
})

describe('compact and isBlank', () => {
  it('leaves out undefined values only', () => {
    expect(compact({ a: 1, b: undefined, c: null, d: false })).toEqual({
      a: 1,
      c: null,
      d: false,
    })
  })

  it('treats blank strings, empty lists and objects as blank', () => {
    expect([null, undefined, '', '  ', [], [''], {}].every(isBlank)).toBe(true)
    expect([0, false, 'x', ['x'], { a: 1 }].some(isBlank)).toBe(false)
  })
})
