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

describe('combine_pdfs', () => {
  const op = App.creates.combine_pdfs.operation

  it('posts typed source PDFs to /combined_pdfs on the sync host and waits for the PDF', async () => {
    fakeClock()
    let body
    nock(SYNC)
      .post('/api/v2/combined_pdfs', (b) => {
        body = b
        return true
      })
      .query({ wait: 'false' })
      .reply(201, { id: 'com_1', state: 'pending' })
    const poll = nock(API)
      .get('/api/v2/combined_pdfs/com_1')
      .reply(200, { id: 'com_1', state: 'processed', files: { pdf: {} } })

    const result = await appTester(op.perform, {
      authData,
      inputData: {
        source_pdfs: [
          { type: 'submission', id: 'sub_1', template_version: '2' },
          { type: 'combined_pdf', id: 'com_0' },
          {
            type: 'template',
            id: 'tpl_1',
            template_version: '2',
            processed: 'false',
          },
          { type: 'custom_file', id: 'cfi_1' },
          { type: 'url', url: 'https://example.com/terms.pdf' },
          { type: '', id: '', url: '' },
        ],
        metadata: { order: '5' },
        expires_in: '60',
      },
    })

    expect(poll.isDone()).toBe(true)
    expect(result.state).toBe('processed')
    // template_version and processed go only on template sources (v2 rejects them elsewhere).
    expect(body).toEqual({
      source_pdfs: [
        { type: 'submission', id: 'sub_1' },
        { type: 'combined_pdf', id: 'com_0' },
        {
          type: 'template',
          id: 'tpl_1',
          template_version: '2',
          processed: false,
        },
        { type: 'custom_file', id: 'cfi_1' },
        { type: 'url', url: 'https://example.com/terms.pdf' },
      ],
      metadata: { order: '5' },
      expires_in: 60,
    })
  })

  it('defaults a source to a submission and checks each one has an ID or URL', async () => {
    let body
    nock(SYNC)
      .post('/api/v2/combined_pdfs', (b) => {
        body = b
        return true
      })
      .query(true)
      .reply(201, { id: 'com_1', state: 'processed' })
    await appTester(op.perform, {
      authData,
      inputData: { source_pdfs: [{ id: 'sub_1' }] },
    })
    expect(body.source_pdfs).toEqual([{ type: 'submission', id: 'sub_1' }])

    const error = await errorFrom(
      appTester(op.perform, {
        authData,
        inputData: { source_pdfs: [{ type: 'url' }] },
      })
    )
    expect(error.message).toBe('Source PDF 1 needs a URL.')
  })

  it('fails for a combined PDF that ends in error', async () => {
    nock(SYNC)
      .post('/api/v2/combined_pdfs')
      .query(true)
      .reply(201, { id: 'com_1', state: 'error', error_message: 'Bad PDF' })
    const error = await errorFrom(
      appTester(op.perform, {
        authData,
        inputData: { source_pdfs: [{ id: 'sub_1' }] },
      })
    )
    expect(error.message).toBe(
      "The PDFs couldn't be combined (state: error): Bad PDF\nCombined PDF: com_1"
    )
  })
})

describe('generate_pdf_batch', () => {
  const op = App.creates.generate_pdf_batch.operation

  it('posts the batch with template_id and template_version in the body, then waits until it has finished', async () => {
    fakeClock()
    let body
    nock(SYNC)
      .post('/api/v2/submissions/batches', (b) => {
        body = b
        return true
      })
      .query({ wait: 'false' })
      .reply(201, { id: 'sbb_1', state: 'pending', processed_at: null })
    nock(API)
      .get('/api/v2/submissions/batches/sbb_1')
      .reply(200, {
        id: 'sbb_1',
        state: 'processed',
        processed_at: '2026-10-27T09:00:05Z',
        submissions: [],
      })

    const result = await appTester(op.perform, {
      authData,
      inputData: {
        template_id: 'tpl_1',
        version: '1',
        test: 'yes',
        output_formats: ['png'],
        submissions: [
          {
            submission_data: '{"first_name": "Jane"}',
            submission_metadata: '{"row": 1}',
          },
          { submission_data: { first_name: 'John' } },
          { submission_data: '', submission_metadata: '' },
        ],
      },
    })
    expect(result.state).toBe('processed')
    expect(body).toEqual({
      template_id: 'tpl_1',
      template_version: '1',
      test: true,
      output_formats: ['png'],
      submissions: [
        { data: { first_name: 'Jane' }, metadata: { row: 1 } },
        { data: { first_name: 'John' } },
      ],
    })
  })

  it('takes the submissions as a JSON list instead', async () => {
    let body
    nock(SYNC)
      .post('/api/v2/submissions/batches', (b) => {
        body = b
        return true
      })
      .query(true)
      .reply(201, {
        id: 'sbb_1',
        state: 'processed',
        processed_at: '2026-10-27T09:00:05Z',
      })
    const submissions = [
      { template_id: 'tpl_2', data: { a: 1 }, expires_in: 60 },
    ]
    await appTester(op.perform, {
      authData,
      inputData: { submissions_json: JSON.stringify(submissions) },
    })
    expect(body).toEqual({ submissions })
  })

  it('keeps waiting while a failed batch still has pending PDFs, then fails naming each failure', async () => {
    fakeClock()
    nock(SYNC)
      .post('/api/v2/submissions/batches')
      .query(true)
      .reply(201, { id: 'sbb_1', state: 'pending' })
    nock(API)
      .get('/api/v2/submissions/batches/sbb_1')
      .reply(200, { id: 'sbb_1', state: 'error', processed_at: null })
      .get('/api/v2/submissions/batches/sbb_1')
      .reply(200, {
        id: 'sbb_1',
        state: 'error',
        processed_at: '2026-10-27T09:00:05Z',
        error_count: 1,
        total_count: 2,
        submissions: [
          { id: 'sub_1', state: 'processed' },
          {
            id: 'sub_2',
            state: 'image_download_failed',
            error_message: 'No image at that URL',
          },
        ],
      })
    const error = await errorFrom(
      appTester(op.perform, {
        authData,
        inputData: { template_id: 'tpl_1', submissions_json: '[{"data": {}}]' },
      })
    )
    expect(error.message).toBe(
      [
        "Some PDFs in the batch couldn't be generated (state: error): 1 of 2 failed.",
        'sub_2: image_download_failed: No image at that URL',
        'Submission batch: sbb_1',
      ].join('\n')
    )
  })

  // A batch records a submission for each item that fails validation, and
  // each detail names it.
  it("names each invalid item's recorded submission", async () => {
    nock(SYNC)
      .post('/api/v2/submissions/batches')
      .query(true)
      .reply(
        422,
        apiError('invalid_data', 'Some submissions are invalid', {
          details: [
            {
              code: 'required',
              message: 'is required',
              pointer: '/submissions/1/data/last_name',
              submission_id: 'sub_b',
            },
          ],
        })
      )
    const error = await errorFrom(
      appTester(op.perform, {
        authData,
        inputData: {
          template_id: 'tpl_1',
          submissions_json: '[{"data": {}}, {"data": {}}]',
        },
      })
    )
    expect(error.message).toBe(
      [
        'DocSpring API error 422 invalid_data: Some submissions are invalid',
        '/submissions/1/data/last_name: is required (Submission: sub_b)',
        'Request ID: req_1234567890abcdef01',
      ].join('\n')
    )
  })

  it('needs at least one submission', async () => {
    const error = await errorFrom(
      appTester(op.perform, { authData, inputData: { template_id: 'tpl_1' } })
    )
    expect(error.message).toBe('Add at least one submission to the batch.')
  })
})
