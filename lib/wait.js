'use strict'

const { NOT_READY, formatApiError } = require('./errors')

// Zapier stops an action's perform after 30 seconds, but the sync API host
// waits up to 95 seconds, and when Zapier cuts a request off we never learn
// the ID of the record it created. So operations that make a file create the
// record with `wait=false` (the response has its ID straight away) and then
// poll it here, for up to WAIT_BUDGET_MS from the start of the perform. When
// it's still not ready, the error names the record so the user can get it
// later instead of creating it again.
const WAIT_BUDGET_MS = 25000

// Delays before each check, in milliseconds (checks at about 1, 3, 5, 8, 11,
// 15, 20 and 25 seconds). Most PDFs are ready within a few seconds, so this
// usually takes one or two checks; every check counts against the account's
// API rate limit.
const POLL_DELAYS_MS = [1000, 2000, 2000, 3000, 3000, 4000, 5000, 5000]

// Replaceable in tests.
const clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}

function notReadyError(z, idKey, id, reason) {
  const lines = [NOT_READY[idKey](id)]
  if (reason) lines.push(reason)
  return new z.errors.Error(lines.join('\n'), 'NotReady', 504)
}

// Poll `url` until `isPending(record)` is false, then return the record.
//   startedAt: when the perform started (clock.now()), for the time budget
//   idKey:     the record's `*_id` key in API errors (submission_id, ...)
//   id:        the record's ID
async function waitForRecord(z, { url, isPending, startedAt, idKey, id }) {
  const deadline = startedAt + WAIT_BUDGET_MS
  for (const delay of POLL_DELAYS_MS) {
    if (clock.now() + delay > deadline) break
    await clock.sleep(delay)

    let response
    try {
      response = await z.request({
        url,
        method: 'GET',
        skipThrowForStatus: true,
        // Handle 429s here: the platform's ThrottledError would make Zapier
        // retry the whole step, creating the record a second time.
        throwForThrottlingEarly: false,
      })
    } catch (e) {
      throw notReadyError(z, idKey, id, `Checking it failed: ${e.message}`)
    }

    if (response.status === 429 || response.status >= 500) {
      throw notReadyError(
        z,
        idKey,
        id,
        `Checking it failed: ${formatApiError(response)}`
      )
    }
    if (response.status >= 400) {
      throw new z.errors.Error(
        `${formatApiError(response)}\n${NOT_READY[idKey](id)}`,
        'DocSpringApiError',
        response.status
      )
    }
    if (!isPending(response.data)) return response.data
  }
  throw notReadyError(z, idKey, id)
}

module.exports = { waitForRecord, clock, WAIT_BUDGET_MS, POLL_DELAYS_MS }
