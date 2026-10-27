'use strict'

const App = require('../../index')

// API v2 rejects a webhook whose scope lists can't apply to its event type, so
// each trigger offers only the filters that apply to its events.
describe('trigger filters match what each webhook event can be scoped by', () => {
  const inputKeys = (triggerKey) =>
    App.triggers[triggerKey].operation.inputFields.map((field) => field.key)

  it.each([
    'submission_created',
    'submission_processed',
    'submission_failed',
    'submission_declined',
    'submission_updated',
    'submission_expired',
    'signature_request_viewed',
    'signature_request_completed',
    'signature_request_declined',
    'signature_request_updated',
  ])('%s offers template, folder and mode filters', (key) => {
    expect(inputKeys(key)).toEqual(['template_ids', 'folder_ids', 'mode'])
  })

  it.each(['template_created', 'template_updated', 'template_deleted'])(
    '%s offers template and folder filters (template events have no mode)',
    (key) => {
      expect(inputKeys(key)).toEqual(['template_ids', 'folder_ids'])
    }
  )

  it.each(['folder_created', 'folder_updated', 'folder_deleted'])(
    '%s offers only the folder filter',
    (key) => {
      expect(inputKeys(key)).toEqual(['folder_ids'])
    }
  )

  it.each([
    'combined_pdf_processed',
    'combined_pdf_failed',
    'combined_pdf_expired',
    'submission_batch_processed',
    'submission_batch_failed',
    'custom_file_created',
  ])('%s offers only the mode filter', (key) => {
    expect(inputKeys(key)).toEqual(['mode'])
  })
})
