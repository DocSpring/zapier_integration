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

// Every setting of a field, as GET /templates/{template_id}/fields returns
// it (API v2's `Field`), apart from the ones each sample field sets.
const FIELD_SETTINGS = {
  acroform_name: null,
  static: false,
  editable: false,
  default: null,
  title: '',
  description: '',
  placeholder: '',
  metadata: '',
  option_list: null,
  combined_field_names: '',
  combined_field_type: 'separator',
  combined_field_separator: ' ',
  combined_field_format: '',
  integer: false,
  minimum: null,
  maximum: null,
  exclusive_minimum: false,
  exclusive_maximum: false,
  include_time: null,
  signature_allow_draw: true,
  signature_allow_type: true,
  barcode_symbology: 'code_128',
  hidden: false,
  rotation: 0,
  display_type: 'text',
  opacity: 1,
  date_time_format: null,
  typeface: null,
  font_size: null,
  character_spacing: 0,
  bold: false,
  uppercase: false,
  strikethrough: false,
  keep_leading_spaces: false,
  overflow: 'shrink_to_fit',
  multiline: false,
  multiline_lines: null,
  min_length: 0,
  max_length: null,
  auto_calculate_max_length: false,
  color: null,
  color_field_name: null,
  color_field_required: false,
  background_color: null,
  background_color_field_name: null,
  background_color_field_required: false,
  alignment: 'left',
  v_alignment: 'bottom',
  comb: false,
  comb_number_of_cells: 2,
  comb_value_offset: 0,
  shape_type: 'square',
  shape_sides: 6,
  shape_border_width: 2,
  shape_border_color: '4A90E2',
  shape_border_color_field_name: null,
  shape_border_color_field_required: false,
  shape_fill_color: null,
  shape_fill_color_field_name: null,
  shape_fill_color_field_required: false,
  check_character: '&#10004;',
  check_color: null,
  check_color_field_name: null,
  check_color_field_required: false,
  qrcode_color: null,
  qrcode_color_field_name: null,
  qrcode_color_field_required: false,
  true_text: null,
  false_text: null,
  condition: null,
  string_condition_type: 'equals',
  number_condition_type: 'equals',
  number_condition_range_min: null,
  number_condition_range_max: null,
  number_condition_range_exclusive_min: false,
  number_condition_range_exclusive_max: false,
  invert_boolean_condition: false,
  currency: false,
  decimal_places: null,
  image_scale_type: 'fit',
  image_gravity: 'Center',
  dependencies: null,
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
        ...FIELD_SETTINGS,
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
        ...FIELD_SETTINGS,
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
