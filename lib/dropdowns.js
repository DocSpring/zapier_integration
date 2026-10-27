'use strict'

const { MAX_DROPDOWN_ITEMS, PAGE_SIZE } = require('./constants')
const { listPage } = require('./api')

// perform for a hidden trigger that powers a dynamic dropdown. Zapier asks for
// page 0, then 1, 2, … as the user scrolls ("load more"); API v2 lists page by
// cursor, so each page's `next_cursor` is kept with z.cursor for the next one.
// Stops at 1,000 items.
function pagedDropdown(path, toChoice, paramsFrom = () => ({})) {
  return async (z, bundle) => {
    const page = (bundle.meta && bundle.meta.page) || 0
    if (page * PAGE_SIZE >= MAX_DROPDOWN_ITEMS) return []

    let cursor
    if (page > 0) {
      cursor = await z.cursor.get()
      // An empty cursor means the previous page was the last one.
      if (!cursor) return []
    }

    const params = { ...paramsFrom(bundle), limit: PAGE_SIZE }
    if (cursor) params.cursor = cursor
    const { items, nextCursor } = await listPage(z, path, params)
    await z.cursor.set(nextCursor || '')
    return items.map(toChoice)
  }
}

module.exports = { pagedDropdown }
