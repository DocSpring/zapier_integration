'use strict'

const nock = require('nock')
const {
  App,
  appTester,
  authData,
  API,
  apiError,
  errorFrom,
} = require('../helpers')

const search = (key) => App.searches[key].operation

describe('get-by-ID searches', () => {
  it.each([
    ['get_submission', 'submission_id', 'sub_1', '/api/v2/submissions/sub_1'],
    [
      'get_submission_batch',
      'submission_batch_id',
      'sbb_1',
      '/api/v2/submissions/batches/sbb_1',
    ],
    [
      'get_combined_pdf',
      'combined_pdf_id',
      'com_1',
      '/api/v2/combined_pdfs/com_1',
    ],
    [
      'get_signature_request',
      'signature_request_id',
      'srq_1',
      '/api/v2/signature_requests/srq_1',
    ],
    ['get_template', 'template_id', 'tpl_1', '/api/v2/templates/tpl_1'],
    [
      'list_template_fields',
      'template_id',
      'tpl_1',
      '/api/v2/templates/tpl_1/fields',
    ],
    [
      'get_template_page_images',
      'template_id',
      'tpl_1',
      '/api/v2/templates/tpl_1/page_images',
    ],
  ])(
    '%s returns the record from GET %s, and nothing for a 404',
    async (key, idKey, id, path) => {
      nock(API).get(path).reply(200, { id })
      expect(
        await appTester(search(key).perform, {
          authData,
          inputData: { [idKey]: id },
        })
      ).toEqual([{ id }])

      nock(API).get(path).reply(404, apiError('not_found', 'Not found'))
      expect(
        await appTester(search(key).perform, {
          authData,
          inputData: { [idKey]: id },
        })
      ).toEqual([])
    }
  )

  it('still reports errors other than a 404', async () => {
    nock(API)
      .get('/api/v2/submissions/sub_1')
      .reply(401, apiError('unauthorized', 'Invalid API token'))
    const error = await errorFrom(
      appTester(search('get_submission').perform, {
        authData,
        inputData: { submission_id: 'sub_1' },
      })
    )
    expect(error.message).toMatch(/^DocSpring API error 401 unauthorized/)
  })

  it('passes the version and include_data options', async () => {
    const scope = nock(API)
      .get('/api/v2/templates/tpl_1/fields')
      .query({ version: '1.2.0' })
      .reply(200, { template_id: 'tpl_1', fields: [] })
      .get('/api/v2/templates/tpl_1/page_images')
      .query({ version: 'draft' })
      .reply(200, { template_id: 'tpl_1', pages: [] })
      .get('/api/v2/submissions/batches/sbb_1')
      .query({ include_data: 'true' })
      .reply(200, { id: 'sbb_1' })
    await appTester(search('list_template_fields').perform, {
      authData,
      inputData: { template_id: 'tpl_1', version: '1.2.0' },
    })
    await appTester(search('get_template_page_images').perform, {
      authData,
      inputData: { template_id: 'tpl_1', version: 'draft' },
    })
    await appTester(search('get_submission_batch').perform, {
      authData,
      inputData: { submission_batch_id: 'sbb_1', include_data: 'yes' },
    })
    expect(scope.isDone()).toBe(true)
  })

  it('URL-encodes IDs', async () => {
    const scope = nock(API)
      .get('/api/v2/submissions/sub_1%2F..%2Fx')
      .reply(200, { id: 'x' })
    await appTester(search('get_submission').perform, {
      authData,
      inputData: { submission_id: 'sub_1/../x' },
    })
    expect(scope.isDone()).toBe(true)
  })
})

describe('find_submissions', () => {
  it('lists submissions with test=true|false instead of type, and a limit', async () => {
    nock(API)
      .get('/api/v2/submissions')
      .query({
        test: 'false',
        created_after: '2026-10-01T00:00:00Z',
        include_data: 'true',
        limit: '5',
      })
      .reply(200, {
        data: [{ id: 'sub_2' }, { id: 'sub_1' }],
        next_cursor: 'sub_1',
      })
    const result = await appTester(search('find_submissions').perform, {
      authData,
      inputData: {
        test: 'live',
        created_after: '2026-10-01T00:00:00Z',
        include_data: true,
        limit: '5',
      },
    })
    expect(result).toEqual([{ id: 'sub_2' }, { id: 'sub_1' }])
  })

  it("lists one template's submissions, test and live", async () => {
    const scope = nock(API)
      .get('/api/v2/templates/tpl_1/submissions')
      .query({ limit: '10' })
      .reply(200, { data: [], next_cursor: null })
    await appTester(search('find_submissions').perform, {
      authData,
      inputData: { template_id: 'tpl_1', test: 'any' },
    })
    expect(scope.isDone()).toBe(true)
  })
})

describe('find_templates', () => {
  it('searches by name and folder with limit (not page/per_page)', async () => {
    nock(API)
      .get('/api/v2/templates')
      .query({ query: 'invoice', parent_folder_id: 'fld_1', limit: '10' })
      .reply(200, {
        data: [{ id: 'tpl_1', name: 'Invoice' }],
        next_cursor: null,
      })
    const result = await appTester(search('find_templates').perform, {
      authData,
      inputData: { query: 'invoice', parent_folder_id: 'fld_1' },
    })
    expect(result).toEqual([{ id: 'tpl_1', name: 'Invoice' }])
  })
})

describe('list_folders', () => {
  it('returns the first page of folders in a folder', async () => {
    nock(API)
      .get('/api/v2/folders')
      .query({ parent_folder_id: 'fld_1', limit: '100' })
      .reply(200, { data: [{ id: 'fld_2', name: 'A' }], next_cursor: 'fld_2' })
    const result = await appTester(search('list_folders').perform, {
      authData,
      inputData: { parent_folder_id: 'fld_1' },
    })
    expect(result).toEqual([{ id: 'fld_2', name: 'A' }])
  })

  // Find or Create Folder: Create Folder puts a folder with a blank Parent at
  // the top level, so the search must only find one there too (not a folder
  // with the same name somewhere else).
  it('finds a folder by name at the top level when Parent is blank, across pages', async () => {
    nock(API)
      .get('/api/v2/folders')
      .query({ limit: '100' })
      .reply(200, {
        data: [
          { id: 'fld_1', name: 'Contracts', parent_folder_id: 'fld_9' },
          { id: 'fld_3', name: 'Other', parent_folder_id: null },
        ],
        next_cursor: 'fld_3',
      })
      .get('/api/v2/folders')
      .query({ limit: '100', cursor: 'fld_3' })
      .reply(200, {
        data: [{ id: 'fld_2', name: 'Contracts', parent_folder_id: null }],
        next_cursor: null,
      })
    const result = await appTester(search('list_folders').perform, {
      authData,
      inputData: { name: 'contracts', parent_folder_id: '' },
    })
    expect(result.map((f) => f.id)).toEqual(['fld_2'])
  })

  it.each([{}, { parent_folder_id: 'root' }])(
    'lists only top-level folders for %p',
    async (inputData) => {
      nock(API)
        .get('/api/v2/folders')
        .query({ limit: '100' })
        .reply(200, {
          data: [
            { id: 'fld_1', name: 'Top', parent_folder_id: null },
            { id: 'fld_2', name: 'Nested', parent_folder_id: 'fld_1' },
          ],
          next_cursor: null,
        })
      const result = await appTester(search('list_folders').perform, {
        authData,
        inputData,
      })
      expect(result.map((f) => f.id)).toEqual(['fld_1'])
    }
  )
})
