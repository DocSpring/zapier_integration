'use strict'

const { makeHookTrigger } = require('../lib/hooks')
const scopeFields = require('../lib/scopeFields')
const lists = require('../lib/performLists')

// One REST-hook trigger per API v2 webhook event, except `webhook.*` (see
// webhook-events in the DocSpring docs). Each subscribes a version 4 webhook to
// its one event.
//   [event type, label, description, filters, performList builder]
const EVENTS = [
  [
    'submission.created',
    'Submission Created',
    'Triggers when a submission is created, before its PDF is generated.',
    scopeFields.standard,
    lists.listSubmissions,
  ],
  [
    'submission.processed',
    'Submission Processed',
    "Triggers when a submission's PDF has been generated and is ready to download.",
    scopeFields.standard,
    lists.listSubmissions,
  ],
  [
    'submission.failed',
    'Submission Failed',
    "Triggers when a submission's PDF couldn't be generated.",
    scopeFields.standard,
    lists.listSubmissions,
  ],
  [
    'submission.declined',
    'Submission Declined',
    'Triggers when a signer declines to sign, which cancels the submission.',
    scopeFields.standard,
    lists.listSubmissions,
  ],
  [
    'submission.updated',
    'Submission Updated',
    'Triggers when a submission is updated.',
    scopeFields.standard,
    lists.listSubmissions,
  ],
  [
    'submission.expired',
    'Submission Expired',
    'Triggers when a submission expires and its data and PDF are deleted.',
    scopeFields.standard,
    lists.listSubmissions,
  ],
  [
    'signature_request.viewed',
    'Signature Request Viewed',
    'Triggers when someone first opens a signature request.',
    scopeFields.standard,
    lists.sampleList('signature_request'),
  ],
  [
    'signature_request.completed',
    'Signature Request Completed',
    'Triggers when someone completes a signature request (signs it, or fills it in when there is nothing to sign).',
    scopeFields.standard,
    lists.sampleList('signature_request'),
  ],
  [
    'signature_request.declined',
    'Signature Request Declined',
    'Triggers when someone declines to sign a signature request.',
    scopeFields.standard,
    lists.sampleList('signature_request'),
  ],
  [
    'signature_request.updated',
    'Signature Request Updated',
    'Triggers when a signature request is updated.',
    scopeFields.standard,
    lists.sampleList('signature_request'),
  ],
  [
    'combined_pdf.processed',
    'Combined PDF Processed',
    'Triggers when a combined PDF has been generated and is ready to download.',
    scopeFields.modeOnly,
    lists.listCombinedPdfs,
  ],
  [
    'combined_pdf.failed',
    'Combined PDF Failed',
    "Triggers when PDFs couldn't be combined.",
    scopeFields.modeOnly,
    lists.listCombinedPdfs,
  ],
  [
    'combined_pdf.expired',
    'Combined PDF Expired',
    'Triggers when a combined PDF expires and its PDF is deleted.',
    scopeFields.modeOnly,
    lists.listCombinedPdfs,
  ],
  [
    'submission_batch.processed',
    'Submission Batch Processed',
    'Triggers when every PDF in a batch has been generated.',
    scopeFields.modeOnly,
    lists.sampleList('submission_batch'),
  ],
  [
    'submission_batch.failed',
    'Submission Batch Failed',
    "Triggers when a batch has finished and at least one of its PDFs couldn't be generated.",
    scopeFields.modeOnly,
    lists.sampleList('submission_batch'),
  ],
  [
    'template.created',
    'Template Created',
    'Triggers when a template is created.',
    scopeFields.withoutMode,
    lists.listTemplates,
  ],
  [
    'template.updated',
    'Template Updated',
    'Triggers when a template is updated.',
    scopeFields.withoutMode,
    lists.listTemplates,
  ],
  [
    'template.deleted',
    'Template Deleted',
    'Triggers when a template is deleted. The event has the template as it was just before.',
    scopeFields.withoutMode,
    lists.listTemplates,
  ],
  [
    'custom_file.created',
    'Custom File Created',
    'Triggers when a custom file (a PDF to combine) is uploaded.',
    scopeFields.modeOnly,
    lists.listCustomFiles,
  ],
  [
    'folder.created',
    'Folder Created',
    'Triggers when a folder is created.',
    scopeFields.folderOnly,
    lists.listFolders,
  ],
  [
    'folder.updated',
    'Folder Updated',
    'Triggers when a folder is renamed or moved.',
    scopeFields.folderOnly,
    lists.listFolders,
  ],
  [
    'folder.deleted',
    'Folder Deleted',
    'Triggers when a folder is deleted. The event has the folder as it was just before.',
    scopeFields.folderOnly,
    lists.listFolders,
  ],
]

const NOUNS = {
  submission: 'Submission',
  signature_request: 'Signature Request',
  combined_pdf: 'Combined PDF',
  submission_batch: 'Submission Batch',
  template: 'Template',
  custom_file: 'Custom File',
  folder: 'Folder',
}

module.exports = EVENTS.map(
  ([eventType, label, description, inputFields, performList]) => {
    const resourceType = eventType.split('.')[0]
    return makeHookTrigger({
      key: eventType.replace('.', '_'),
      noun: NOUNS[resourceType],
      label,
      description,
      eventType,
      resourceType,
      inputFields,
      performList: performList(eventType),
    })
  }
)

module.exports.EVENT_TYPES = EVENTS.map(([eventType]) => eventType)
