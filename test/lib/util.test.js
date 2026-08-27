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
    expect(normalizeHost('http://localhost:3000/')).toBe('http://localhost:3000')
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
