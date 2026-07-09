'use strict'

// Every DocSpring API path is mounted under this prefix on every region host.
const API_PREFIX = '/api/v1'

// The current webhook delivery payload version (app/models/webhook.rb
// DEFAULT_VERSION). We pin this when subscribing so the delivery body shape
// (`{ id, event, timestamp, data }`) that lib/payload.js parses can't drift if
// the server default ever changes.
const WEBHOOK_VERSION = 3

// Template field inputs on the Generate PDF action are namespaced with this
// prefix so a template field literally named `test`, `metadata`, `version`,
// etc. can never collide with a control input of the same name.
const DATA_FIELD_PREFIX = 'data__'

// Control inputs on Generate PDF. Listed for documentation/guarding; the
// `data__` namespace is what actually prevents collisions.
const RESERVED_CREATE_KEYS = [
  'template_id',
  'test',
  'metadata',
  'password',
  'editable',
  'expires_in',
  'version',
  'field_overrides',
  'data_requests',
]

module.exports = {
  API_PREFIX,
  WEBHOOK_VERSION,
  DATA_FIELD_PREFIX,
  RESERVED_CREATE_KEYS,
}
