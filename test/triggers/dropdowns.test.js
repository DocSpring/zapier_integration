'use strict'

const nock = require('nock')
const { App, authData, API, runWithCursor } = require('../helpers')

const page = (ids, nextCursor) => ({
  data: ids.map((id) => ({ id, name: `Name ${id}`, path: '/Contracts' })),
  next_cursor: nextCursor,
})

describe('template_choices (Template dropdowns)', () => {
  const method = App.triggers.template_choices.operation.perform

  it('pages through the templates with the cursor', async () => {
    const cursors = {}
    nock(API)
      .get('/api/v2/templates')
      .query({ limit: '100' })
      .reply(200, page(['tpl_1', 'tpl_2'], 'tpl_2'))
      .get('/api/v2/templates')
      .query({ limit: '100', cursor: 'tpl_2' })
      .reply(200, page(['tpl_3'], null))

    const first = await runWithCursor(
      method,
      { authData, meta: { page: 0 } },
      cursors
    )
    expect(first).toEqual([
      {
        id: 'tpl_1',
        label: 'Name tpl_1 (/Contracts)',
        name: 'Name tpl_1',
        path: '/Contracts',
      },
      {
        id: 'tpl_2',
        label: 'Name tpl_2 (/Contracts)',
        name: 'Name tpl_2',
        path: '/Contracts',
      },
    ])
    const second = await runWithCursor(
      method,
      { authData, meta: { page: 1 } },
      cursors
    )
    expect(second.map((t) => t.id)).toEqual(['tpl_3'])
    // The last page leaves no cursor, so there's no third request.
    expect(
      await runWithCursor(method, { authData, meta: { page: 2 } }, cursors)
    ).toEqual([])
  })

  it('stops at 1,000 templates', async () => {
    const cursors = { cursor: 'tpl_1000' }
    expect(
      await runWithCursor(method, { authData, meta: { page: 10 } }, cursors)
    ).toEqual([])
  })
})

describe('folder_choices (Folder dropdowns)', () => {
  const method = App.triggers.folder_choices.operation.perform

  it('pages with the cursor and labels each folder with its full path', async () => {
    const cursors = {}
    nock(API)
      .get('/api/v2/folders')
      .query({ limit: '100' })
      .reply(200, {
        data: [
          { id: 'fld_1', name: 'Contracts', path: '/' },
          { id: 'fld_2', name: '2026', path: '/Contracts' },
        ],
        next_cursor: 'fld_2',
      })
      .get('/api/v2/folders')
      .query({ limit: '100', cursor: 'fld_2' })
      .reply(200, {
        data: [{ id: 'fld_3', name: 'Old', path: '/' }],
        next_cursor: null,
      })

    const first = await runWithCursor(
      method,
      { authData, meta: { page: 0 } },
      cursors
    )
    expect(first).toEqual([
      { id: 'fld_1', label: '/Contracts', name: 'Contracts' },
      { id: 'fld_2', label: '/Contracts/2026', name: '2026' },
    ])
    const second = await runWithCursor(
      method,
      { authData, meta: { page: 1 } },
      cursors
    )
    expect(second).toEqual([{ id: 'fld_3', label: '/Old', name: 'Old' }])
  })
})
