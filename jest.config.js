'use strict'

// Standalone config so this project doesn't inherit the monorepo's root jest
// config (which scopes tests to client/). Runs only this integration's tests.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.js'],
}
