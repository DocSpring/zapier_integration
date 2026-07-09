'use strict'

const { makeHookTrigger } = require('../lib/hooks')
const { listSubmissions } = require('../lib/performLists')

module.exports = makeHookTrigger({
  key: 'submission_created',
  noun: 'PDF Submission',
  label: 'PDF Submission Created',
  description:
    'Triggers when a new submission is created, before it has finished processing.',
  eventType: 'submission.created',
  resource: 'submission',
  performList: listSubmissions('submission.created'),
})
