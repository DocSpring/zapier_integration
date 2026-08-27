'use strict'

const App = require('../index')

// Pins the app-level settings that Zapier's integration checks look at, so a
// refactor can't silently regress them (see DESIGN.md "Conventions / gotchas").
describe('app definition', () => {
  it('handles error statuses and blank inputs itself rather than via the platform', () => {
    expect(App.flags.skipThrowForStatus).toBe(true)
    // D028 — blank-input handling lives in our performs, not in the platform.
    expect(App.flags.cleanInputData).toBe(false)
  })

  it('links every required auth field to where its value is found (D002)', () => {
    const markdownLink = /\[[^\]]+\]\(https:\/\/[^)\s]+\)/
    const required = App.authentication.fields.filter((f) => f.required)
    expect(required.map((f) => f.key)).toEqual(['region', 'token_id', 'token_secret'])
    for (const field of required) {
      expect(field.helpText).toMatch(markdownLink)
    }
  })
})
