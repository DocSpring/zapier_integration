'use strict'

const nock = require('nock')
const {
  App,
  appTester,
  authData,
  API,
  SYNC,
  fakeClock,
  errorFrom,
} = require('../helpers')

describe('check_data', () => {
  const op = App.creates.check_data.operation

  it('validates the data with version in the query, and returns valid: false without failing', async () => {
    let body
    const result = {
      valid: false,
      template_id: 'tpl_1',
      template_version: '1.0.0',
      error: { code: 'invalid_data' },
    }
    nock(API)
      .post('/api/v2/templates/tpl_1/submissions/validate', (b) => {
        body = b
        return true
      })
      .query({ version: '1' })
      .reply(200, result)
    const output = await appTester(op.perform, {
      authData,
      inputData: {
        template_id: 'tpl_1',
        version: '1',
        data__first_name: 'Jane',
        test: 'false',
        signature_requests:
          '[{"fields": ["signature"], "auth_type": "email_link"}]',
      },
    })
    expect(output).toEqual(result)
    expect(body).toEqual({
      data: { first_name: 'Jane' },
      signature_requests: [{ fields: ['signature'], auth_type: 'email_link' }],
    })
  })

  it('shows every template field as optional, so missing ones are reported, not blocked', async () => {
    nock(API)
      .get('/api/v2/templates/tpl_1/schema')
      .reply(200, {
        properties: { first_name: { type: 'string' } },
        required: ['first_name'],
      })
    const dynamicFields = op.inputFields[op.inputFields.length - 1]
    const fields = await appTester(dynamicFields, {
      authData,
      inputData: { template_id: 'tpl_1' },
    })
    expect(fields[0]).toMatchObject({
      key: 'data__first_name',
      required: false,
    })
  })
})

describe('generate_submission_files', () => {
  const op = App.creates.generate_submission_files.operation

  it('asks for PNG page images on the sync host and waits for them', async () => {
    fakeClock()
    nock(SYNC)
      .post('/api/v2/submissions/sub_1/generate_files', { formats: ['png'] })
      .query({ wait: 'false' })
      .reply(200, {
        id: 'sub_1',
        state: 'processed',
        files: { pdf: { state: 'processed' }, png: { state: 'pending' } },
      })
    nock(API)
      .get('/api/v2/submissions/sub_1')
      .reply(200, {
        id: 'sub_1',
        state: 'processed',
        files: {
          pdf: { state: 'processed' },
          png: { state: 'processed', page_count: 2 },
        },
      })
    const result = await appTester(op.perform, {
      authData,
      inputData: { submission_id: 'sub_1', formats: ['png'] },
    })
    expect(result.files.png).toEqual({ state: 'processed', page_count: 2 })
  })

  it("fails when the files couldn't be made", async () => {
    nock(SYNC)
      .post('/api/v2/submissions/sub_1/generate_files')
      .query(true)
      .reply(200, {
        id: 'sub_1',
        state: 'processed',
        files: { png: { state: 'error', error_message: 'Too many pages' } },
      })
    const error = await errorFrom(
      appTester(op.perform, { authData, inputData: { submission_id: 'sub_1' } })
    )
    expect(error.message).toBe(
      "The png files couldn't be made (state: error): Too many pages\nSubmission: sub_1"
    )
  })
})

describe('expire_submission', () => {
  it('deletes the submission and returns it as it was expired', async () => {
    nock(API)
      .delete('/api/v2/submissions/sub_1')
      .reply(200, { id: 'sub_1', expired: true })
    const result = await appTester(
      App.creates.expire_submission.operation.perform,
      {
        authData,
        inputData: { submission_id: 'sub_1' },
      }
    )
    expect(result).toEqual({ id: 'sub_1', expired: true })
  })
})

describe('create_signing_link', () => {
  const op = App.creates.create_signing_link.operation

  it('sends the type in the body and returns the token with its link', async () => {
    const token = {
      id: 'tok_1',
      type: 'api',
      signature_request_url:
        'https://app.docspring.com/signature_requests/srq_1?x',
    }
    nock(API)
      .post('/api/v2/signature_requests/srq_1/tokens', { type: 'api' })
      .reply(201, token)
    const result = await appTester(op.perform, {
      authData,
      inputData: { signature_request_id: 'srq_1', type: 'api' },
    })
    expect(result).toEqual(token)
  })

  it('makes a 7-day email link by default', async () => {
    const scope = nock(API)
      .post('/api/v2/signature_requests/srq_1/tokens', { type: 'email' })
      .reply(201, { id: 'tok_1' })
    await appTester(op.perform, {
      authData,
      inputData: { signature_request_id: 'srq_1' },
    })
    expect(scope.isDone()).toBe(true)
  })
})
