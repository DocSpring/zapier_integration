'use strict'

const { makeHookTrigger } = require('../lib/hooks')
const { listSubmissions } = require('../lib/performLists')

module.exports = makeHookTrigger({
  key: 'submission_failed',
  noun: 'PDF Submission',
  label: 'PDF Submission Failed',
  description:
    'Triggers when a submission fails to process (e.g. invalid data or a rendering error).',
  eventType: 'submission.failed',
  resource: 'submission',
  performList: listSubmissions('submission.failed'),
})
