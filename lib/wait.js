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

// Waits before each check: 1, 2, 4, 8, 8, … seconds (checks at about 1, 3, 7,
// 15 and 23 seconds), the last one cut short to check once more as the time
// runs out. Most PDFs are ready within a few seconds, so this usually takes
// one or two checks; every check counts against the account's API rate limit
// (test tokens: 5 requests a minute, in bursts of up to 15).
const FIRST_POLL_DELAY_MS = 1000
const MAX_POLL_DELAY_MS = 8000
// A last wait shorter than this isn't worth a request.
const MIN_POLL_DELAY_MS = 1000

// Replaceable in tests.
const clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}

// The time budget of a perform that started at `startedAt`.
function deadlineFrom(startedAt) {
  return startedAt + WAIT_BUDGET_MS
}

// A 429's Retry-After (DocSpring sends whole seconds) in milliseconds, or
// undefined when it's missing or not a number of seconds.
function retryAfterMs(response) {
  const value =
    response.headers && typeof response.headers.get === 'function'
      ? response.headers.get('retry-after')
      : undefined
  if (value == null || !/^\s*\d+\s*$/.test(String(value))) return undefined
  return parseInt(value, 10) * 1000
}

// Whether waiting `ms` from now still ends within the budget.
function fitsBudget(startedAt, ms) {
  return clock.now() + ms <= deadlineFrom(startedAt)
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
// A rate-limited check (429) waits for Retry-After when that fits the time
// left; otherwise, like a failed check, it ends the wait with an error naming
// the record (never a retry of the whole step, which would make it again).
async function waitForRecord(z, { url, isPending, startedAt, idKey, id }) {
  const deadline = deadlineFrom(startedAt)
  let delay = FIRST_POLL_DELAY_MS
  let wait = delay
  for (;;) {
    wait = Math.min(wait, deadline - clock.now())
    if (wait < MIN_POLL_DELAY_MS) break
    await clock.sleep(wait)

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

    if (response.status === 429) {
      const retryAfter = retryAfterMs(response)
      if (retryAfter !== undefined && fitsBudget(startedAt, retryAfter)) {
        wait = Math.max(retryAfter, MIN_POLL_DELAY_MS)
        continue
      }
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
    delay = Math.min(delay * 2, MAX_POLL_DELAY_MS)
    wait = delay
  }
  throw notReadyError(z, idKey, id)
}

module.exports = {
  waitForRecord,
  clock,
  deadlineFrom,
  retryAfterMs,
  fitsBudget,
  WAIT_BUDGET_MS,
}
