'use strict'

const nock = require('nock')
const {
  App,
  appTester,
  authData,
  API,
  SYNC,
  fakeClock,
  apiError,
  errorFrom,
} = require('../helpers')

const op = App.creates.generate_pdf.operation
const dynamicFields = op.inputFields[op.inputFields.length - 1]

const pending = { id: 'sub_1', state: 'pending', files: {} }
const processed = {
  id: 'sub_1',
  state: 'processed',
  files: {
    pdf: {
      state: 'processed',
      download_url: 'https://downloads.docspring.com/sub_1.pdf',
    },
  },
}

describe('generate_pdf', () => {
  it("shows the template's fields for the chosen version", async () => {
    const scope = nock(API)
      .get('/api/v2/templates/tpl_1/schema')
      .query({ version: '1.2.0' })
      .reply(200, {
        properties: { name: { type: 'string' } },
        required: ['name'],
      })

    const fields = await appTester(dynamicFields, {
      authData,
      inputData: { template_id: 'tpl_1', version: '1.2.0' },
    })
    expect(scope.isDone()).toBe(true)
    expect(fields).toEqual([
      { key: 'data__name', label: 'Name', type: 'string', required: true },
    ])
  })

  it('creates the submission on the sync host with wait=false and version in the query, then waits for it', async () => {
    fakeClock()
    let body
    const scope = nock(SYNC)
      .post('/api/v2/templates/tpl_1/submissions', (b) => {
        body = b
        return true
      })
      .query({ wait: 'false', version: 'draft' })
      .reply(201, pending)
    const poll = nock(API)
      .get('/api/v2/submissions/sub_1')
      .reply(200, pending)
      .get('/api/v2/submissions/sub_1')
      .reply(200, processed)

    const result = await appTester(op.perform, {
      authData,
      inputData: {
        template_id: 'tpl_1',
        version: 'draft',
        data__name: 'Jane',
        data__email: 'jane@example.com',
        data__blank: '',
        test: 'false',
        editable: 'true',
        expires_in: '3600',
        metadata: { user_id: '42' },
        output_formats: ['pdf', 'png'],
        pdf_passphrase: 's3cret',
        field_overrides: '{"name": {"font_size": 9}}',
      },
    })

    expect(scope.isDone()).toBe(true)
    expect(poll.isDone()).toBe(true)
    // A flat body with real booleans and integers; `test` is left out when false.
    expect(body).toEqual({
      data: { name: 'Jane', email: 'jane@example.com' },
      metadata: { user_id: '42' },
      password: 's3cret',
      expires_in: 3600,
      editable: true,
      output_formats: ['pdf', 'png'],
      field_overrides: { name: { font_size: 9 } },
    })
    // The submission as API v2 returns it.
    expect(result).toEqual(processed)
  })

  it('sends test: true only when the PDF is a test', async () => {
    let body
    nock(SYNC)
      .post('/api/v2/templates/tpl_1/submissions', (b) => {
        body = b
        return true
      })
      .query(true)
      .reply(201, processed)
    await appTester(op.perform, {
      authData,
      inputData: { template_id: 'tpl_1', test: true },
    })
    expect(body).toEqual({ data: {}, test: true })
  })

  it('returns the pending submission straight away when waiting is off', async () => {
    nock(SYNC)
      .post('/api/v2/templates/tpl_1/submissions')
      .query({ wait: 'false' })
      .reply(201, pending)
    const result = await appTester(op.perform, {
      authData,
      inputData: { template_id: 'tpl_1', wait: 'false' },
    })
    expect(result).toEqual(pending)
  })

  it.each([
    'error',
    'syntax_error',
    'image_download_failed',
    'image_processing_failed',
  ])(
    'fails for a submission whose state is %s, naming its error and ID',
    async (state) => {
      nock(SYNC)
        .post('/api/v2/templates/tpl_1/submissions')
        .query(true)
        .reply(201, {
          id: 'sub_1',
          state,
          error_message: 'Could not download the image',
        })
      const error = await errorFrom(
        appTester(op.perform, { authData, inputData: { template_id: 'tpl_1' } })
      )
      expect(error.message).toBe(
        `The PDF couldn't be generated (state: ${state}): Could not download the image\nSubmission: sub_1`
      )
    }
  )

  it('fails when the polled submission ends in a failure state', async () => {
    fakeClock()
    nock(SYNC)
      .post('/api/v2/templates/tpl_1/submissions')
      .query(true)
      .reply(201, pending)
    nock(API)
      .get('/api/v2/submissions/sub_1')
      .reply(200, { id: 'sub_1', state: 'error', error_message: 'Boom' })
    const error = await errorFrom(
      appTester(op.perform, { authData, inputData: { template_id: 'tpl_1' } })
    )
    expect(error.message).toBe(
      "The PDF couldn't be generated (state: error): Boom\nSubmission: sub_1"
    )
  })

  it("stops waiting within Zapier's time limit and says how to get the PDF later", async () => {
    const clock = fakeClock()
    nock(SYNC)
      .post('/api/v2/templates/tpl_1/submissions')
      .query(true)
      .reply(201, pending)
    nock(API).get('/api/v2/submissions/sub_1').times(20).reply(200, pending)

    const error = await errorFrom(
      appTester(op.perform, { authData, inputData: { template_id: 'tpl_1' } })
    )
    expect(error.message).toBe(
      "The PDF wasn't ready in time. Get it later with Get Submission (sub_1), or use the submission.processed trigger."
    )
    // Zapier stops an action after 30 seconds.
    expect(clock.now).toBeLessThanOrEqual(25000)
    expect(clock.sleeps.length).toBeGreaterThan(3)
  })

  it('waits between checks for 1, 2, 4, 8, 8 seconds, then checks once more at 25 seconds', async () => {
    const clock = fakeClock()
    nock(SYNC)
      .post('/api/v2/templates/tpl_1/submissions')
      .query(true)
      .reply(201, pending)
    const polls = nock(API)
      .get('/api/v2/submissions/sub_1')
      .times(6)
      .reply(200, pending)

    await errorFrom(
      appTester(op.perform, { authData, inputData: { template_id: 'tpl_1' } })
    )
    expect(clock.sleeps).toEqual([1000, 2000, 4000, 8000, 8000, 2000])
    expect(polls.isDone()).toBe(true)
  })

  it('waits for Retry-After when a check is rate limited and there is time', async () => {
    const clock = fakeClock()
    nock(SYNC)
      .post('/api/v2/templates/tpl_1/submissions')
      .query(true)
      .reply(201, pending)
    nock(API)
      .get('/api/v2/submissions/sub_1')
      .reply(429, apiError('rate_limited', 'Too many requests'), {
        'Retry-After': '12',
      })
      .get('/api/v2/submissions/sub_1')
      .reply(200, processed)

    const result = await appTester(op.perform, {
      authData,
      inputData: { template_id: 'tpl_1' },
    })
    expect(result).toEqual(processed)
    expect(clock.sleeps).toEqual([1000, 12000])
  })

  it('stops waiting (without creating it again) when a check is rate limited for longer than the time left', async () => {
    fakeClock()
    nock(SYNC)
      .post('/api/v2/templates/tpl_1/submissions')
      .query(true)
      .reply(201, pending)
    nock(API)
      .get('/api/v2/submissions/sub_1')
      .reply(429, apiError('rate_limited', 'Too many requests'), {
        'Retry-After': '30',
      })
    const error = await errorFrom(
      appTester(op.perform, { authData, inputData: { template_id: 'tpl_1' } })
    )
    expect(error.message).toMatch(
      /^The PDF wasn't ready in time\. Get it later with Get Submission \(sub_1\)/
    )
    expect(error.message).toMatch(
      /Checking it failed: DocSpring API error 429 rate_limited: Too many requests/
    )
  })

  it('stops waiting when a rate-limited check gives no Retry-After', async () => {
    fakeClock()
    nock(SYNC)
      .post('/api/v2/templates/tpl_1/submissions')
      .query(true)
      .reply(201, pending)
    nock(API)
      .get('/api/v2/submissions/sub_1')
      .reply(429, apiError('rate_limited', 'Too many requests'))
    const error = await errorFrom(
      appTester(op.perform, { authData, inputData: { template_id: 'tpl_1' } })
    )
    expect(error.message).toMatch(
      /^The PDF wasn't ready in time\. Get it later with Get Submission \(sub_1\)/
    )
  })

  it('waits for page images that are still being made', async () => {
    fakeClock()
    nock(SYNC)
      .post('/api/v2/templates/tpl_1/submissions')
      .query(true)
      .reply(201, {
        ...processed,
        files: { ...processed.files, png: { state: 'pending' } },
      })
    nock(API)
      .get('/api/v2/submissions/sub_1')
      .reply(200, {
        ...processed,
        files: { ...processed.files, png: { state: 'processed' } },
      })
    const result = await appTester(op.perform, {
      authData,
      inputData: { template_id: 'tpl_1', output_formats: ['png'] },
    })
    expect(result.files.png.state).toBe('processed')
  })

  it('shows invalid data errors with the recorded submission ID', async () => {
    nock(SYNC)
      .post('/api/v2/templates/tpl_1/submissions')
      .query(true)
      .reply(
        422,
        apiError(
          'invalid_data',
          "The data doesn't match the template's fields: /data/last_name is required",
          {
            details: [
              {
                code: 'required',
                message: 'is required',
                pointer: '/data/last_name',
              },
            ],
            submission_id: 'sub_bad',
          }
        )
      )
    const error = await errorFrom(
      appTester(op.perform, { authData, inputData: { template_id: 'tpl_1' } })
    )
    expect(error.message).toBe(
      [
        "DocSpring API error 422 invalid_data: The data doesn't match the template's fields: /data/last_name is required",
        '/data/last_name: is required',
        'Submission: sub_bad',
        'Request ID: req_1234567890abcdef01',
      ].join('\n')
    )
  })

  it('rejects inputs that are not the right type before sending anything', async () => {
    const error = await errorFrom(
      appTester(op.perform, {
        authData,
        inputData: { template_id: 'tpl_1', expires_in: 'tomorrow' },
      })
    )
    expect(error.message).toBe(
      'Expires In must be a whole number, not "tomorrow".'
    )
  })

  it('uses the EU sync host for the EU region', async () => {
    const scope = nock('https://sync.api-eu.docspring.com')
      .post('/api/v2/templates/tpl_1/submissions')
      .query(true)
      .reply(201, processed)
    await appTester(op.perform, {
      authData: { ...authData, region: 'eu' },
      inputData: { template_id: 'tpl_1' },
    })
    expect(scope.isDone()).toBe(true)
  })
})
