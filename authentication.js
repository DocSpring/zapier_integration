'use strict'

const { REGION_CHOICES } = require('./lib/regions')
const { API_PREFIX } = require('./lib/constants')

// Verify the connection. The middleware injects the region host + Basic auth,
// so this only needs the path. A 200 `{status:'success'}` passes; a 401 is
// turned into a friendly error by the afterResponse middleware.
const test = {
  url: `${API_PREFIX}/authentication`,
  method: 'GET',
}

// Human-readable label for the connected account, derived entirely from the
// token (no extra API call): the token-id prefix tells us Test vs Live.
const connectionLabel = (z, bundle) => {
  const tokenId = (bundle.authData && bundle.authData.token_id) || ''
  const env = tokenId.startsWith('api_test_') ? 'Test' : 'Live'
  const region = (
    (bundle.authData && bundle.authData.region) ||
    'us'
  ).toUpperCase()
  return `DocSpring ${env} · ${region}${tokenId ? ` · ${tokenId}` : ''}`
}

module.exports = {
  // Custom (not basic) so we can collect a Region dropdown + self-hosted host
  // alongside the token. The Basic Authorization header is built in middleware.
  type: 'custom',
  test,
  connectionLabel,
  fields: [
    {
      key: 'region',
      label: 'Region',
      type: 'string',
      required: true,
      default: 'us',
      choices: REGION_CHOICES,
      helpText:
        'The DocSpring region your account is in. Choose **Self-hosted / Enterprise** to enter a custom domain.',
    },
    {
      key: 'custom_host',
      label: 'Self-hosted Host',
      type: 'string',
      required: false,
      helpText:
        'Only for the **Self-hosted / Enterprise** region. Your DocSpring domain, e.g. `docspring.example.com` ' +
        '(include `http://` and a port for local installs).',
    },
    {
      key: 'token_id',
      label: 'API Token ID',
      type: 'string',
      required: true,
      helpText:
        'Your DocSpring API Token ID. Starts with `api_` (live) or `api_test_` (test). ' +
        'Create one under Settings → API Tokens.',
    },
    {
      key: 'token_secret',
      label: 'API Token Secret',
      type: 'password',
      required: true,
      helpText: 'The API Token Secret shown when you created the token.',
    },
  ],
}
