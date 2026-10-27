'use strict'

const authentication = require('./authentication')
const { addBaseUrlAndAuth, checkForErrors } = require('./lib/middleware')

// Triggers: one REST hook per API v2 webhook event, and the hidden triggers
// behind the Template and Folder dropdowns.
const webhookEvents = require('./triggers/webhook_events')
const templateChoices = require('./triggers/template_choices')
const folderChoices = require('./triggers/folder_choices')

// Creates
const generatePdf = require('./creates/generate_pdf')
const generatePdfBatch = require('./creates/generate_pdf_batch')
const checkData = require('./creates/check_data')
const generateSubmissionFiles = require('./creates/generate_submission_files')
const expireSubmission = require('./creates/expire_submission')
const combinePdfs = require('./creates/combine_pdfs')
const createSignatureRequest = require('./creates/create_signature_request')
const createSigningLink = require('./creates/create_signing_link')
const createTemplate = require('./creates/create_template')
const replaceTemplatePdf = require('./creates/replace_template_pdf')
const copyTemplate = require('./creates/copy_template')
const moveTemplate = require('./creates/move_template')
const publishTemplateVersion = require('./creates/publish_template_version')
const templateFieldCreates = require('./creates/template_fields')
const createFolder = require('./creates/create_folder')

// Searches
const submissionSearches = require('./searches/submissions')
const templateSearches = require('./searches/templates')
const listFolders = require('./searches/list_folders')

const triggers = [...webhookEvents, templateChoices, folderChoices]

const creates = [
  generatePdf,
  generatePdfBatch,
  checkData,
  generateSubmissionFiles,
  expireSubmission,
  combinePdfs,
  createSignatureRequest,
  createSigningLink,
  createTemplate,
  replaceTemplatePdf,
  copyTemplate,
  moveTemplate,
  publishTemplateVersion,
  templateFieldCreates.addTemplateFields,
  templateFieldCreates.updateTemplateFields,
  templateFieldCreates.removeTemplateFields,
  createFolder,
]

const searches = [
  submissionSearches.getSubmission,
  submissionSearches.findSubmissions,
  submissionSearches.getSubmissionBatch,
  submissionSearches.getCombinedPdf,
  submissionSearches.getSignatureRequest,
  templateSearches.findTemplates,
  templateSearches.getTemplate,
  templateSearches.listTemplateFields,
  templateSearches.getTemplatePageImages,
  listFolders,
]

const byKey = (list) =>
  list.reduce((acc, item) => {
    if (acc[item.key]) throw new Error(`Duplicate key: ${item.key}`)
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

  searchOrCreates: {
    list_folders: {
      key: 'list_folders',
      display: {
        label: 'Find or Create Folder',
        description:
          "Finds a folder by name, or creates it when there isn't one.",
      },
      search: 'list_folders',
      create: 'create_folder',
    },
  },

  flags: {
    // Don't let the platform strip empty strings / nulls / empty
    // arrays+objects from bundle.inputData before perform (Zapier check D028).
    // Every perform handles blanks itself (lib/util.js), so blank inputs are
    // left out of requests in one visible place.
    cleanInputData: false,
  },
}
