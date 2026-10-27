'use strict'

const { version: INTEGRATION_VERSION } = require('../package.json')

// Every DocSpring API path is under this prefix, on every region host.
const API_PREFIX = '/api/v2'

// Sent on every request to DocSpring, so api_logs.user_agent can count the
// integration's users by version.
const USER_AGENT = `docspring-zapier/${INTEGRATION_VERSION}`

// The last version of this integration on API v1, for self-hosted installs
// that don't have API v2 yet.
const PREVIOUS_VERSION = '1.1.0'

// Template field inputs are namespaced so a template field named `test`,
// `metadata`, `version`, etc. can never collide with a control input. The
// prefix also says how perform turns the input back into a `data` value:
//   data__       the value as the user mapped it
//   data_json__  JSON text (nested objects, lists of objects)
//   data_image__ an image URL, sent as {"url": ...} (or JSON for base64/text)
const DATA_FIELD_PREFIX = 'data__'
const DATA_JSON_FIELD_PREFIX = 'data_json__'
const DATA_IMAGE_FIELD_PREFIX = 'data_image__'

// List paging: v2 takes `limit` (1-100) and `cursor`. Dropdowns stop after
// 1,000 items.
const PAGE_SIZE = 100
const MAX_DROPDOWN_ITEMS = 1000

module.exports = {
  API_PREFIX,
  USER_AGENT,
  INTEGRATION_VERSION,
  PREVIOUS_VERSION,
  DATA_FIELD_PREFIX,
  DATA_JSON_FIELD_PREFIX,
  DATA_IMAGE_FIELD_PREFIX,
  PAGE_SIZE,
  MAX_DROPDOWN_ITEMS,
}
