'use strict'

const App = require('../../index')

// The Rails webhook API rejects template/folder filters combined with event
// types those filters can never match (combined submissions and batches are
// not template/folder scopable). These triggers must only offer Mode.
describe('trigger scope fields match server-side scopability', () => {
  const inputKeys = (triggerKey) =>
    App.triggers[triggerKey].operation.inputFields.map((field) => field.key)

  it.each([
    'combined_submission_processed',
    'combined_submission_failed',
    'submission_batch_processed',
    'submission_batch_failed',
  ])('%s offers only the Mode filter', (triggerKey) => {
    expect(inputKeys(triggerKey)).toEqual(['mode'])
  })

  it.each([
    'submission_processed',
    'submission_failed',
    'submission_created',
    'submission_expired',
    'data_request_completed',
    'data_request_viewed',
  ])('%s offers template/folder/mode filters', (triggerKey) => {
    expect(inputKeys(triggerKey)).toEqual([
      'template_uids',
      'folder_uids',
      'mode',
    ])
  })

  it.each(['template_created', 'template_updated', 'template_deleted'])(
    '%s offers template/folder filters without mode (mode-agnostic events)',
    (triggerKey) => {
      expect(inputKeys(triggerKey)).toEqual(['template_uids', 'folder_uids'])
    }
  )
})
