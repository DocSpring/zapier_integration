'use strict'

// A template, as API v2 returns it in lists and webhook events
// (`TemplateSummary`). Get Template returns the same fields plus its HTML,
// defaults, field dependency rules and published versions (`Template`).
const ID = 'tpl_1234567890abcdef01'

const outputFields = [
  { key: 'id', label: 'Template ID', type: 'string' },
  { key: 'name', label: 'Name', type: 'string' },
  { key: 'description', label: 'Description', type: 'string' },
  { key: 'template_type', label: 'Template Type', type: 'string' },
  { key: 'ready', label: 'Ready', type: 'boolean' },
  { key: 'parent_folder_id', label: 'Folder ID', type: 'string' },
  { key: 'path', label: 'Folder Path', type: 'string' },
  { key: 'version', label: 'Version', type: 'string' },
  { key: 'latest_version', label: 'Latest Version', type: 'string' },
  {
    key: 'version_published_at',
    label: 'Version Published At',
    type: 'datetime',
  },
  { key: 'locked', label: 'Locked', type: 'boolean' },
  { key: 'document__filename', label: 'PDF Filename', type: 'string' },
  { key: 'document__state', label: 'PDF State', type: 'string' },
  {
    key: 'document__error_message',
    label: 'PDF Error Message',
    type: 'string',
  },
  { key: 'document__page_count', label: 'Page Count', type: 'integer' },
  { key: 'document__download_url', label: 'PDF Download URL', type: 'string' },
  {
    key: 'document__permanent_url',
    label: 'PDF Permanent URL',
    type: 'string',
  },
  {
    key: 'editable_submissions',
    label: 'Editable Submissions',
    type: 'boolean',
  },
  {
    key: 'allow_additional_properties',
    label: 'Allow Additional Properties',
    type: 'boolean',
  },
  { key: 'public_web_form', label: 'Public Web Form', type: 'boolean' },
  { key: 'public_submissions', label: 'Public Submissions', type: 'boolean' },
  { key: 'last_changed_at', label: 'Last Changed At', type: 'datetime' },
  {
    key: 'last_changed_by__type',
    label: 'Last Changed By (Type)',
    type: 'string',
  },
  {
    key: 'last_changed_by__name',
    label: 'Last Changed By (Name)',
    type: 'string',
  },
  { key: 'created_at', label: 'Created At', type: 'datetime' },
  { key: 'updated_at', label: 'Updated At', type: 'datetime' },
]

const sample = {
  id: ID,
  name: 'Rental Contract',
  description: null,
  template_type: 'pdf',
  ready: true,
  document: {
    filename: 'rental-contract.pdf',
    md5: 'd41d8cd98f00b204e9800998ecf8427e',
    state: 'processed',
    error_message: null,
    field_reimport_state: 'none',
    page_count: 2,
    page_dimensions: [
      [612, 792],
      [612, 792],
    ],
    has_fillable_fields: false,
    page_processing_statuses: [],
    field_logic_status: null,
    download_url: `https://downloads.docspring.com/store/${ID}.pdf?Expires=1761555600&Signature=...&Key-Pair-Id=...`,
    permanent_url: `https://app.docspring.com/templates/${ID}/document`,
  },
  parent_folder_id: 'fld_1234567890abcdef01',
  path: '/Contracts',
  version: null,
  latest_version: '1.0.0',
  version_published_at: null,
  locked: false,
  add_signature_request_submission_id_footers: true,
  ai_field_naming_language: 'auto',
  allow_additional_properties: false,
  allow_skipping_optional_fields: false,
  default_form_mode: 'web',
  editable_submissions: false,
  embed_domains: [],
  embed_edit_allow_settings: false,
  embed_edit_allow_versioning: false,
  embed_edit_allow_document_replacement: false,
  encrypt_pdfs: false,
  has_encrypt_pdfs_password: false,
  expire_submissions: false,
  expire_after: 7,
  expiration_interval: 'days',
  merge_audit_trail_pdf: true,
  parse_dates_using_template_date_format: false,
  public_submissions: false,
  public_web_form: false,
  redirect_url: null,
  has_slack_webhook_url: false,
  last_changed_at: '2026-10-27T09:00:00Z',
  last_changed_by: {
    type: 'user',
    user_id: 'usr_1234567890abcdef01',
    external_id: null,
    name: 'Jane Doe',
    email: null,
  },
  created_at: '2026-10-20T09:00:00Z',
  updated_at: '2026-10-27T09:00:00Z',
}

// Get Template's extra fields.
const fullOutputFields = outputFields.concat([
  { key: 'versions[]version', label: 'Published Versions', type: 'string' },
  {
    key: 'versions[]published_at',
    label: 'Published Versions: Published At',
    type: 'datetime',
  },
])

const fullSample = {
  ...sample,
  defaults: {
    typeface: 'Helvetica',
    font_size: 11,
    character_spacing: 0,
    color: '444444',
    opacity: 1,
    date_format: '%m/%d/%Y',
    date_time_format: '%m/%d/%Y %H:%M:%S',
    check_color: '444444',
    shape_border_color: '4A90E2',
  },
  field_groups: [],
  predefined_fields: [],
  predefined_fields_sample_data: null,
  html: null,
  scss: null,
  header_html: null,
  footer_html: null,
  html_engine_options: null,
  embed_edit_token: null,
  field_dependencies: [],
  versions: [
    {
      version: '1.0.0',
      description: 'First version',
      published_at: '2026-10-21T09:00:00Z',
      published_by: {
        type: 'user',
        user_id: 'usr_1234567890abcdef01',
        external_id: null,
        name: 'Jane Doe',
        email: null,
      },
    },
  ],
}

module.exports = {
  noun: 'Template',
  outputFields,
  sample,
  fullOutputFields,
  fullSample,
}
