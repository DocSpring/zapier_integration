'use strict'

const { apiPath } = require('../lib/api')
const { SUBMISSION_FILES, createAndWait } = require('../lib/records')
const { asArray, seg } = require('../lib/util')
const { waitInput } = require('../lib/templates')
const { shouldWait } = require('../lib/submissionInputs')
const submission = require('../lib/resources/submission')

const perform = async (z, bundle) => {
  const input = bundle.inputData || {}
  const formats = asArray(input.formats)
  return createAndWait(z, bundle, {
    kind: SUBMISSION_FILES,
    path: apiPath('submissions', seg(input.submission_id), 'generate_files'),
    body: { formats: formats.length ? formats : ['png'] },
    wait: shouldWait(z, input, 'Wait for the files?'),
  })
}

module.exports = {
  key: 'generate_submission_files',
  noun: 'Submission',
  display: {
    label: 'Generate Submission Files',
    description:
      'Makes more files for a processed submission, such as a PNG image of each page of its PDF.',
  },
  operation: {
    inputFields: [
      {
        key: 'submission_id',
        label: 'Submission ID',
        type: 'string',
        required: true,
        helpText: 'The ID of a processed submission (`sub_…`).',
      },
      {
        key: 'formats',
        label: 'Formats',
        type: 'string',
        list: true,
        required: false,
        default: 'png',
        choices: [
          { value: 'png', sample: 'png', label: 'PNG images of each page' },
        ],
        helpText:
          'The files to add. A format the submission already has is left as it is.',
      },
      waitInput('files'),
    ],
    perform,
    outputFields: submission.outputFields,
    sample: {
      ...submission.sample,
      output_formats: ['pdf', 'png'],
      files: {
        ...submission.sample.files,
        png: {
          state: 'processed',
          error_message: null,
          page_count: 1,
          pages: [
            {
              page: 1,
              width: 1190,
              height: 1540,
              download_url:
                'https://downloads.docspring.com/store/sub_1234567890abcdef01_page_1.png?Expires=1761555600&Signature=...',
              permanent_url:
                'https://app.docspring.com/submissions/sub_1234567890abcdef01/files/png/1',
              filename: 'sub_1234567890abcdef01_page_1.png',
              content_type: 'image/png',
              size: 120394,
              sha256:
                '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
            },
          ],
        },
      },
    },
  },
}
