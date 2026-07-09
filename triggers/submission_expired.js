'use strict'

const { makeHookTrigger } = require('../lib/hooks')
const { listSubmissions } = require('../lib/performLists')

module.exports = makeHookTrigger({
  key: 'submission_expired',
  noun: 'PDF Submission',
  label: 'PDF Submission Expired',
  description:
    'Triggers when a submission expires and its PDF/data are removed.',
  eventType: 'submission.expired',
  resource: 'submission',
  performList: listSubmissions('submission.expired'),
})
