'use strict'

const zapier = require('zapier-platform-core')
const App = require('../index')
const { clock } = require('../lib/wait')

const appTester = zapier.createAppTester(App)

const authData = {
  region: 'us',
  token_id: 'api_test_abc',
  token_secret: 'sekret',
}

const API = 'https://api.docspring.com'
const SYNC = 'https://sync.api.docspring.com'

// Run a paging perform with a cursor store. Zapier keeps z.cursor per Zap
// step; appTester has no store (and core's test mock keys values by the
// cursor itself), so this gives the perform a z whose cursor lives in
// `store`, with the real z.request and middleware.
function runWithCursor(perform, bundle, store) {
  return appTester(async (z, b) => {
    const cursor = {
      get: async () => store.cursor || null,
      set: async (value) => {
        if (typeof value !== 'string')
          throw new TypeError('cursor value must be a string')
        store.cursor = value
      },
    }
    return perform({ ...z, cursor }, b)
  }, bundle)
}

// Make waiting instant: sleep advances a fake clock instead.
function fakeClock() {
  const state = { now: 0, sleeps: [] }
  jest.spyOn(clock, 'now').mockImplementation(() => state.now)
  jest.spyOn(clock, 'sleep').mockImplementation(async (ms) => {
    state.sleeps.push(ms)
    state.now += ms
  })
  return state
}

// An API v2 error body.
function apiError(code, message, extra = {}) {
  return {
    error: {
      code,
      message,
      details: [],
      request_id: 'req_1234567890abcdef01',
      ...extra,
    },
  }
}

// The error a promise rejects with. z.errors.Error encodes its message, code
// and status as JSON (Zapier decodes it to show the message), so decode it.
async function errorFrom(promise) {
  try {
    await promise
  } catch (e) {
    try {
      return JSON.parse(e.message)
    } catch (_e) {
      return { message: e.message, name: e.name }
    }
  }
  throw new Error('Expected the promise to reject')
}

module.exports = {
  App,
  appTester,
  authData,
  API,
  SYNC,
  runWithCursor,
  fakeClock,
  apiError,
  errorFrom,
}
