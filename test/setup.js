'use strict'

const nock = require('nock')

// No test may reach the network: an unmocked request fails instead of going
// to a real DocSpring (or Zapier) host.
nock.disableNetConnect()

afterEach(() => {
  nock.cleanAll()
  jest.restoreAllMocks()
})
