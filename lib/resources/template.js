'use strict'

// Template webhook payload (app/serializers/template_preview_serializer.rb).
module.exports = {
  type: 'Template',
  outputFields: [
    { key: 'name', label: 'Name', type: 'string' },
    { key: 'template_type', label: 'Template Type', type: 'string' },
    { key: 'parent_folder_id', label: 'Parent Folder ID', type: 'string' },
    { key: 'path', label: 'Path', type: 'string' },
    { key: 'description', label: 'Description', type: 'string' },
    { key: 'page_count', label: 'Page Count', type: 'integer' },
    { key: 'document_url', label: 'Document URL', type: 'string' },
    {
      key: 'permanent_document_url',
      label: 'Permanent Document URL',
      type: 'string',
    },
    { key: 'public_web_form', label: 'Public Web Form', type: 'boolean' },
    { key: 'public_submissions', label: 'Public Submissions', type: 'boolean' },
    {
      key: 'editable_submissions',
      label: 'Editable Submissions',
      type: 'boolean',
    },
    { key: 'locked', label: 'Locked', type: 'boolean' },
    { key: 'version', label: 'Version', type: 'string' },
    {
      key: 'version_published_at',
      label: 'Version Published At',
      type: 'datetime',
    },
    { key: 'updated_at', label: 'Updated At', type: 'datetime' },
  ],
  sample: {
    resource_id: 'tpl_000000000000000001',
    name: 'Invoice Template',
    template_type: 'pdf',
    parent_folder_id: null,
    path: '/Invoice Template',
    description: 'Monthly invoice',
    page_count: 1,
    document_url:
      'https://api.docspring.com/api/v1/templates/tpl_000000000000000001/document.pdf',
    permanent_document_url:
      'https://api.docspring.com/templates/tpl_000000000000000001/document',
    public_web_form: false,
    public_submissions: false,
    editable_submissions: false,
    locked: false,
    version: '1',
    version_published_at: '2026-06-30T12:00:00Z',
    updated_at: '2026-06-30T12:00:00Z',
  },
}
