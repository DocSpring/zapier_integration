'use strict'

// The smaller API v2 resources.

const folder = {
  noun: 'Folder',
  outputFields: [
    { key: 'id', label: 'Folder ID', type: 'string' },
    { key: 'name', label: 'Name', type: 'string' },
    { key: 'path', label: 'Parent Path', type: 'string' },
    { key: 'parent_folder_id', label: 'Parent Folder ID', type: 'string' },
    { key: 'created_at', label: 'Created At', type: 'datetime' },
    { key: 'updated_at', label: 'Updated At', type: 'datetime' },
  ],
  sample: {
    id: 'fld_1234567890abcdef01',
    name: 'Contracts',
    path: '/',
    parent_folder_id: null,
    created_at: '2026-10-20T09:00:00Z',
    updated_at: '2026-10-20T09:00:00Z',
  },
}

const customFile = {
  noun: 'Custom File',
  outputFields: [
    { key: 'id', label: 'Custom File ID', type: 'string' },
    { key: 'download_url', label: 'Download URL', type: 'string' },
    { key: 'size', label: 'Size (bytes)', type: 'integer' },
    { key: 'content_type', label: 'Content Type', type: 'string' },
    { key: 'created_at', label: 'Created At', type: 'datetime' },
    { key: 'updated_at', label: 'Updated At', type: 'datetime' },
  ],
  sample: {
    id: 'cfi_1234567890abcdef01',
    download_url:
      'https://downloads.docspring.com/store/cfi_1234567890abcdef01.pdf?Expires=1761555600&Signature=...',
    size: 21843,
    content_type: 'application/pdf',
    created_at: '2026-10-27T09:00:00Z',
    updated_at: '2026-10-27T09:00:00Z',
  },
}

const signatureRequestToken = {
  noun: 'Signing Link',
  outputFields: [
    { key: 'id', label: 'Token ID', type: 'string' },
    {
      key: 'signature_request_id',
      label: 'Signature Request ID',
      type: 'string',
    },
    { key: 'type', label: 'Type', type: 'string' },
    { key: 'signature_request_url', label: 'Signing Link', type: 'string' },
    { key: 'expires_at', label: 'Expires At', type: 'datetime' },
    { key: 'created_at', label: 'Created At', type: 'datetime' },
  ],
  sample: {
    id: 'tok_1234567890abcdef01',
    signature_request_id: 'srq_1234567890abcdef01',
    type: 'email',
    secret: 'abcdef1234567890',
    signature_request_url:
      'https://app.docspring.com/signature_requests/srq_1234567890abcdef01?token_id=tok_1234567890abcdef01&token_secret=abcdef1234567890',
    expires_at: '2026-11-03T09:00:00Z',
    created_at: '2026-10-27T09:00:00Z',
  },
}

const templateVersion = {
  noun: 'Template Version',
  outputFields: [
    { key: 'version', label: 'Version', type: 'string' },
    { key: 'description', label: 'Description', type: 'string' },
    { key: 'published_at', label: 'Published At', type: 'datetime' },
    { key: 'published_by__name', label: 'Published By', type: 'string' },
  ],
  sample: {
    version: '1.1.0',
    description: 'Added a signature field',
    published_at: '2026-10-27T09:00:00Z',
    published_by: {
      type: 'api',
      user_id: null,
      external_id: null,
      name: null,
      email: null,
    },
  },
}

const templateFields = {
  noun: 'Template Fields',
  outputFields: [
    { key: 'template_id', label: 'Template ID', type: 'string' },
    { key: 'version', label: 'Version', type: 'string' },
    { key: 'fields[]id', label: 'Field IDs', type: 'integer' },
    { key: 'fields[]name', label: 'Field Names', type: 'string' },
    { key: 'fields[]type', label: 'Field Types', type: 'string' },
    { key: 'fields[]page', label: 'Field Pages', type: 'integer' },
    { key: 'fields[]required', label: 'Fields Required', type: 'boolean' },
  ],
  sample: {
    template_id: 'tpl_1234567890abcdef01',
    version: null,
    fields: [
      {
        id: 1,
        name: 'first_name',
        type: 'string',
        page: 1,
        required: true,
        x: 72,
        y: 100,
        width: 200,
        height: 20,
      },
      {
        id: 2,
        name: 'signature',
        type: 'signature',
        page: 2,
        required: true,
        x: 72,
        y: 600,
        width: 200,
        height: 40,
      },
    ],
  },
}

const templatePageImages = {
  noun: 'Template Page Images',
  outputFields: [
    { key: 'template_id', label: 'Template ID', type: 'string' },
    { key: 'version', label: 'Version', type: 'string' },
    { key: 'page_count', label: 'Page Count', type: 'integer' },
    { key: 'pages[]page', label: 'Page Numbers', type: 'integer' },
    {
      key: 'pages[]download_url',
      label: 'Page Image Download URLs',
      type: 'string',
    },
    { key: 'pages[]width', label: 'Page Image Widths', type: 'integer' },
    { key: 'pages[]height', label: 'Page Image Heights', type: 'integer' },
  ],
  sample: {
    template_id: 'tpl_1234567890abcdef01',
    version: null,
    page_count: 1,
    pages: [
      {
        page: 1,
        width: 1190,
        height: 1540,
        download_url:
          'https://downloads.docspring.com/store/tpl_1234567890abcdef01_page_1.jpg?Expires=1761555600&Signature=...',
        permanent_url: null,
        filename: 'tpl_1234567890abcdef01_page_1.jpg',
        content_type: 'image/jpeg',
        size: 183204,
        sha256: null,
      },
    ],
  },
}

const submissionValidation = {
  noun: 'Data Check',
  outputFields: [
    { key: 'valid', label: 'Valid', type: 'boolean' },
    { key: 'template_id', label: 'Template ID', type: 'string' },
    { key: 'template_version', label: 'Template Version', type: 'string' },
    { key: 'error__code', label: 'Error Code', type: 'string' },
    { key: 'error__message', label: 'Error Message', type: 'string' },
    { key: 'error__details[]pointer', label: 'Error Fields', type: 'string' },
    { key: 'error__details[]message', label: 'Error Details', type: 'string' },
  ],
  sample: {
    valid: false,
    template_id: 'tpl_1234567890abcdef01',
    template_version: null,
    error: {
      code: 'invalid_data',
      message:
        "The data doesn't match the template's fields: /data/last_name is required",
      details: [
        {
          code: 'required',
          message: 'is required',
          pointer: '/data/last_name',
        },
      ],
      request_id: 'req_1234567890abcdef01',
    },
  },
}

module.exports = {
  folder,
  customFile,
  signatureRequestToken,
  templateVersion,
  templateFields,
  templatePageImages,
  submissionValidation,
}
