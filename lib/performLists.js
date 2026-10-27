'use strict'

const { apiPath, listPage } = require('./api')
const { eventFor, triggerSample } = require('./resources')
const { asArray, compact } = require('./util')

// performList for webhook triggers: the "test trigger" items Zapier shows when
// a Zap is set up. Each item is a recent record from the matching API v2 list,
// shaped exactly like a live delivery's output. Their `id`s aren't real event
// IDs (there's no event yet), so each is made from the event type and record.
const RECENT_LIMIT = 10

function toEvents(resourceType, eventType, items) {
  return items.map((record) =>
    eventFor(
      resourceType,
      eventType,
      record,
      `sample:${eventType}:${record.id}`,
      record.updated_at || record.created_at || null
    )
  )
}

const listSubmissions = (eventType) => async (z, bundle) => {
  const input = bundle.inputData || {}
  const templateIds = asArray(input.template_ids)
  const { items } = await listPage(
    z,
    apiPath('submissions'),
    compact({
      limit: RECENT_LIMIT,
      include_data: true,
      test:
        input.mode === 'test'
          ? true
          : input.mode === 'live'
            ? false
            : undefined,
      template_id: templateIds.length === 1 ? templateIds[0] : undefined,
    })
  )
  return toEvents('submission', eventType, items)
}

const listFrom = (resourceType, path) => (eventType) => async (z) => {
  const { items } = await listPage(z, path, { limit: RECENT_LIMIT })
  return toEvents(resourceType, eventType, items)
}

const listTemplates = listFrom('template', apiPath('templates'))
const listCombinedPdfs = listFrom('combined_pdf', apiPath('combined_pdfs'))
const listCustomFiles = listFrom('custom_file', apiPath('custom_files'))
const listFolders = listFrom('folder', apiPath('folders'))

// Signature requests and submission batches have no list endpoint in API v2:
// the test step shows the trigger's sample instead of making one up.
const sampleList = (resourceType) => (eventType) => async () => [
  triggerSample(resourceType, eventType),
]

module.exports = {
  listSubmissions,
  listTemplates,
  listCombinedPdfs,
  listCustomFiles,
  listFolders,
  sampleList,
}
