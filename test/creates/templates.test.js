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

const create = (key) => App.creates[key].operation

function capture(scope, method, path) {
  const seen = {}
  scope[method](path, (b) => {
    seen.body = b
    return true
  })
  return seen
}

describe('create_template', () => {
  it('creates a PDF template from a URL with AI field detection on the sync host, then waits for its PDF', async () => {
    fakeClock()
    const seen = {}
    nock(SYNC)
      .post('/api/v2/templates', (b) => {
        seen.body = b
        return true
      })
      .query({ wait: 'false' })
      .reply(201, { id: 'tpl_1', document: { state: 'downloading' } })
    nock(API)
      .get('/api/v2/templates/tpl_1')
      .reply(200, { id: 'tpl_1', document: { state: 'pending' } })
      .get('/api/v2/templates/tpl_1')
      .reply(200, { id: 'tpl_1', document: { state: 'processed' } })

    const result = await appTester(create('create_template').perform, {
      authData,
      inputData: {
        name: 'Lease',
        template_type: 'pdf',
        parent_folder_id: 'fld_1',
        document_url: 'https://example.com/lease.pdf',
        detect_fields: 'true',
        field_source: 'auto',
        field_naming: 'ai',
        field_logic: 'none',
        html: '',
      },
    })
    expect(result.document.state).toBe('processed')
    expect(seen.body).toEqual({
      name: 'Lease',
      template_type: 'pdf',
      parent_folder_id: 'fld_1',
      document_url: 'https://example.com/lease.pdf',
      detect_fields: true,
      field_source: 'auto',
      field_naming: 'ai',
      field_logic: 'none',
    })
  })

  it("downloads a file from an earlier step (without DocSpring's credentials) and sends it as base64", async () => {
    const pdf = Buffer.from('%PDF-1.7 test')
    const download = nock('https://zapier-files.example.com', {
      badheaders: ['authorization'],
    })
      .get('/hydrated/abc')
      .reply(200, pdf, {
        'Content-Disposition': 'attachment; filename="lease.pdf"',
      })
    const seen = {}
    nock(SYNC)
      .post('/api/v2/templates', (b) => {
        seen.body = b
        return true
      })
      .query(true)
      .reply(201, { id: 'tpl_1', document: { state: 'processed' } })

    await appTester(create('create_template').perform, {
      authData,
      inputData: {
        name: 'Lease',
        template_type: 'pdf',
        document_file: 'https://zapier-files.example.com/hydrated/abc',
      },
    })
    expect(download.isDone()).toBe(true)
    expect(seen.body).toEqual({
      name: 'Lease',
      template_type: 'pdf',
      document_base64: pdf.toString('base64'),
      filename: 'lease.pdf',
    })
  })

  it('creates an HTML template without waiting for a PDF', async () => {
    const seen = {}
    nock(SYNC)
      .post('/api/v2/templates', (b) => {
        seen.body = b
        return true
      })
      .query(true)
      .reply(201, { id: 'tpl_2', template_type: 'html', document: null })
    const result = await appTester(create('create_template').perform, {
      authData,
      inputData: {
        name: 'Invoice',
        template_type: 'html',
        html: '<p>{{ total }}</p>',
        scss: 'p { color: red; }',
      },
    })
    expect(result.id).toBe('tpl_2')
    expect(seen.body).toEqual({
      name: 'Invoice',
      template_type: 'html',
      html: '<p>{{ total }}</p>',
      scss: 'p { color: red; }',
    })
  })

  it("fails when the template's PDF couldn't be processed", async () => {
    nock(SYNC)
      .post('/api/v2/templates')
      .query(true)
      .reply(201, {
        id: 'tpl_1',
        document: {
          state: 'download_failed',
          error_message: 'The URL returned a 404',
        },
      })
    const error = await errorFrom(
      appTester(create('create_template').perform, {
        authData,
        inputData: {
          name: 'Lease',
          document_url: 'https://example.com/missing.pdf',
        },
      })
    )
    expect(error.message).toBe(
      "The template's PDF couldn't be processed (state: download_failed): The URL returned a 404\nTemplate: tpl_1"
    )
  })

  it('needs a PDF for a PDF template, and only one source', async () => {
    const none = await errorFrom(
      appTester(create('create_template').perform, {
        authData,
        inputData: { name: 'Lease' },
      })
    )
    expect(none.message).toBe('A PDF template needs a PDF URL or a PDF File.')
    const both = await errorFrom(
      appTester(create('create_template').perform, {
        authData,
        inputData: {
          name: 'Lease',
          document_url: 'https://a/x.pdf',
          document_file: 'https://b/y',
        },
      })
    )
    expect(both.message).toBe('Use PDF URL or PDF File, not both.')
  })
})

describe('replace_template_pdf', () => {
  it('PUTs the new PDF to the sync host and waits for it', async () => {
    fakeClock()
    const seen = {}
    nock(SYNC)
      .put('/api/v2/templates/tpl_1/document', (b) => {
        seen.body = b
        return true
      })
      .query({ wait: 'false' })
      .reply(200, { id: 'tpl_1', document: { state: 'downloading' } })
    nock(API)
      .get('/api/v2/templates/tpl_1')
      .reply(200, { id: 'tpl_1', document: { state: 'processed' } })
    await appTester(create('replace_template_pdf').perform, {
      authData,
      inputData: {
        template_id: 'tpl_1',
        document_url: 'https://example.com/v2.pdf',
        reimport_fields: 'true',
      },
    })
    expect(seen.body).toEqual({
      document_url: 'https://example.com/v2.pdf',
      reimport_fields: true,
    })
  })
})

describe('copy, move and publish', () => {
  it('copies to the same folder (left out), the root (null) or a folder', async () => {
    const scope = nock(API)
    const bodies = []
    scope
      .post('/api/v2/templates/tpl_1/copy', (b) => bodies.push(b))
      .times(3)
      .reply(201, { id: 'tpl_2' })
    for (const folder of ['', 'root', 'fld_1']) {
      await appTester(create('copy_template').perform, {
        authData,
        inputData: {
          template_id: 'tpl_1',
          parent_folder_id: folder,
          version: folder === 'fld_1' ? '1.0.0' : '',
        },
      })
    }
    expect(bodies).toEqual([
      {},
      { parent_folder_id: null },
      { parent_folder_id: 'fld_1', version: '1.0.0' },
    ])
  })

  it('moves to a folder, or to the root with null', async () => {
    const bodies = []
    nock(API)
      .post('/api/v2/templates/tpl_1/move', (b) => bodies.push(b))
      .times(3)
      .reply(200, { id: 'tpl_1' })
    for (const folder of ['fld_1', '', 'root']) {
      await appTester(create('move_template').perform, {
        authData,
        inputData: { template_id: 'tpl_1', parent_folder_id: folder },
      })
    }
    expect(bodies).toEqual([
      { parent_folder_id: 'fld_1' },
      { parent_folder_id: null },
      { parent_folder_id: null },
    ])
  })

  it('publishes a version', async () => {
    const scope = nock(API)
      .post('/api/v2/templates/tpl_1/publish_version', {
        version_type: 'minor',
        description: 'New field',
      })
      .reply(201, { version: '1.1.0' })
    const result = await appTester(create('publish_template_version').perform, {
      authData,
      inputData: {
        template_id: 'tpl_1',
        version_type: 'minor',
        description: 'New field',
      },
    })
    expect(scope.isDone()).toBe(true)
    expect(result).toEqual({ version: '1.1.0' })
  })
})

describe('template fields', () => {
  it('adds and updates fields from JSON', async () => {
    const fields = [{ name: 'first_name', type: 'string', page: 1 }]
    const scope = nock(API)
      .post('/api/v2/templates/tpl_1/fields', { fields })
      .reply(201, { template_id: 'tpl_1', fields })
      .put('/api/v2/templates/tpl_1/fields', {
        fields: [{ id: 1, required: false }],
      })
      .reply(200, { template_id: 'tpl_1', fields })
    await appTester(create('add_template_fields').perform, {
      authData,
      inputData: { template_id: 'tpl_1', fields: JSON.stringify(fields) },
    })
    await appTester(create('update_template_fields').perform, {
      authData,
      inputData: {
        template_id: 'tpl_1',
        fields: '[{"id": 1, "required": false}]',
      },
    })
    expect(scope.isDone()).toBe(true)
  })

  it('rejects fields that are not a JSON list', async () => {
    const error = await errorFrom(
      appTester(create('add_template_fields').perform, {
        authData,
        inputData: { template_id: 'tpl_1', fields: '{"name": "x"}' },
      })
    )
    expect(error.message).toBe('Fields must be a JSON list ([...]).')
  })

  it("removes fields by ID, offering the template's fields to choose from", async () => {
    nock(API)
      .get('/api/v2/templates/tpl_1/fields')
      .reply(200, {
        template_id: 'tpl_1',
        fields: [{ id: 7, name: 'first_name', page: 1 }],
      })
    const dynamicFields = create('remove_template_fields').inputFields[1]
    const [input] = await appTester(dynamicFields, {
      authData,
      inputData: { template_id: 'tpl_1' },
    })
    expect(input.choices).toEqual([
      { value: '7', sample: '7', label: 'first_name (page 1, ID 7)' },
    ])

    const scope = nock(API)
      .post('/api/v2/templates/tpl_1/fields/remove', { field_ids: [7, 8] })
      .reply(200, { fields: [] })
    await appTester(create('remove_template_fields').perform, {
      authData,
      inputData: { template_id: 'tpl_1', field_ids: ['7', 8] },
    })
    expect(scope.isDone()).toBe(true)
  })
})

describe('create_folder', () => {
  it('creates a folder in a parent folder, or at the top level', async () => {
    const bodies = []
    nock(API)
      .post('/api/v2/folders', (b) => bodies.push(b))
      .times(2)
      .reply(201, { id: 'fld_2', name: 'Leases' })
    await appTester(create('create_folder').perform, {
      authData,
      inputData: { name: 'Leases', parent_folder_id: 'fld_1' },
    })
    await appTester(create('create_folder').perform, {
      authData,
      inputData: { name: 'Leases', parent_folder_id: 'root' },
    })
    expect(bodies).toEqual([
      { name: 'Leases', parent_folder_id: 'fld_1' },
      { name: 'Leases' },
    ])
  })
})
