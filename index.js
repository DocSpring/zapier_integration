'use strict'

const authentication = require('./authentication')
const { addBaseUrlAndAuth, checkForErrors } = require('./lib/middleware')

// Triggers (REST hooks)
const submissionProcessed = require('./triggers/submission_processed')
const submissionFailed = require('./triggers/submission_failed')
const submissionCreated = require('./triggers/submission_created')
const submissionExpired = require('./triggers/submission_expired')
const dataRequestCompleted = require('./triggers/data_request_completed')
const dataRequestViewed = require('./triggers/data_request_viewed')
const combinedSubmissionProcessed = require('./triggers/combined_submission_processed')
const combinedSubmissionFailed = require('./triggers/combined_submission_failed')
const submissionBatchProcessed = require('./triggers/submission_batch_processed')
const submissionBatchFailed = require('./triggers/submission_batch_failed')
const templateCreated = require('./triggers/template_created')
const templateUpdated = require('./triggers/template_updated')
const templateDeleted = require('./triggers/template_deleted')

// Hidden triggers (dynamic dropdown sources)
const listTemplates = require('./triggers/list_templates')
const listFolders = require('./triggers/list_folders')

// Creates
const generatePdf = require('./creates/generate_pdf')
const combinePdfs = require('./creates/combine_pdfs')

// Searches
const findTemplate = require('./searches/find_template')
const findSubmission = require('./searches/find_submission')

const triggers = [
  submissionProcessed,
  submissionFailed,
  submissionCreated,
  submissionExpired,
  dataRequestCompleted,
  dataRequestViewed,
  combinedSubmissionProcessed,
  combinedSubmissionFailed,
  submissionBatchProcessed,
  submissionBatchFailed,
  templateCreated,
  templateUpdated,
  templateDeleted,
  listTemplates,
  listFolders,
]

const creates = [generatePdf, combinePdfs]
const searches = [findTemplate, findSubmission]

const byKey = (list) =>
  list.reduce((acc, item) => {
    acc[item.key] = item
    return acc
  }, {})

module.exports = {
  version: require('./package.json').version,
  platformVersion: require('zapier-platform-core').version,

  authentication,

  beforeRequest: [addBaseUrlAndAuth],
  afterResponse: [checkForErrors],

  triggers: byKey(triggers),
  creates: byKey(creates),
  searches: byKey(searches),

  flags: {
    // We surface API errors ourselves in afterResponse, so let the platform
    // skip its own throw-on-non-2xx.
    skipThrowForStatus: true,
    // Don't let the platform silently strip empty strings / nulls / empty
    // arrays+objects from bundle.inputData before perform (Zapier check D028).
    // Every perform handles blanks explicitly (asArray, parseDict,
    // `|| undefined`, removeMissingValuesFrom), so input handling is
    // predictable and visible in this codebase rather than in the platform.
    cleanInputData: false,
  },
}
