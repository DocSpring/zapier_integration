'use strict'

const { resolveBaseUrl, resolveSyncBaseUrl } = require('../../lib/regions')

const bundleFor = (region, customHost) => ({
  authData: { region, custom_host: customHost },
})

describe('resolveBaseUrl', () => {
  it('maps each region to its standard host', () => {
    expect(resolveBaseUrl(bundleFor('us'))).toBe('https://api.docspring.com')
    expect(resolveBaseUrl(bundleFor('eu'))).toBe('https://api-eu.docspring.com')
    expect(resolveBaseUrl(bundleFor('au'))).toBe('https://api-au.docspring.com')
  })

  it('defaults to US when region is missing', () => {
    expect(resolveBaseUrl({ authData: {} })).toBe('https://api.docspring.com')
    expect(resolveBaseUrl({})).toBe('https://api.docspring.com')
  })

  it('uses the normalized custom host for self-hosted', () => {
    expect(
      resolveBaseUrl(bundleFor('self_hosted', 'docspring.example.com'))
    ).toBe('https://docspring.example.com')
    expect(
      resolveBaseUrl(bundleFor('self_hosted', 'http://localhost:3000/'))
    ).toBe('http://localhost:3000')
  })

  it('throws a clear error when self-hosted host is missing', () => {
    expect(() => resolveBaseUrl(bundleFor('self_hosted', ''))).toThrow(
      /custom host is required/i
    )
  })
})

describe('resolveSyncBaseUrl', () => {
  it('maps each region to its sync host', () => {
    expect(resolveSyncBaseUrl(bundleFor('us'))).toBe(
      'https://sync.api.docspring.com'
    )
    expect(resolveSyncBaseUrl(bundleFor('eu'))).toBe(
      'https://sync.api-eu.docspring.com'
    )
    expect(resolveSyncBaseUrl(bundleFor('au'))).toBe(
      'https://sync.api-au.docspring.com'
    )
  })

  it('falls back to the single custom origin for self-hosted', () => {
    expect(
      resolveSyncBaseUrl(bundleFor('self_hosted', 'docspring.example.com'))
    ).toBe('https://docspring.example.com')
  })
})
