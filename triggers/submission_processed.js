'use strict'

const { makeHookTrigger } = require('../lib/hooks')
const { listSubmissions } = require('../lib/performLists')

module.exports = makeHookTrigger({
  key: 'submission_processed',
  noun: 'PDF Submission',
  label: 'PDF Submission Processed',
  description:
    'Triggers when a submission finishes processing and the PDF is ready to download.',
  eventType: 'submission.processed',
  resource: 'submission',
  performList: listSubmissions('submission.processed'),
})
