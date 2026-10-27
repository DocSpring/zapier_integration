'use strict'

const { REGION_CHOICES } = require('./lib/regions')
const { apiPath } = require('./lib/api')
const { throwForApiError } = require('./lib/errors')

// Check the connection with GET /api/v2/authentication ({"authenticated":
// true}). The middleware adds the region host and Basic auth. A self-hosted
// install without API v2 answers 404, which throwForApiError explains.
const test = async (z, bundle) => {
  const response = await z.request({
    url: apiPath('authentication'),
    method: 'GET',
    skipThrowForStatus: true,
  })
  throwForApiError(response, z, bundle)
  return response.data
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

// Where users find their credentials. Zapier check D002 wants every auth
// field's help text to link directly to the relevant page.
const API_TOKENS_URL = 'https://app.docspring.com/api_tokens'
const AUTH_DOCS_URL = 'https://docspring.com/docs/api-guide/authentication/'

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
        'The DocSpring region your account is in — it matches the dashboard you sign in to: ' +
        '[app.docspring.com](https://app.docspring.com) (United States) or ' +
        '[app-eu.docspring.com](https://app-eu.docspring.com) (Europe). ' +
        'Choose **Self-hosted / Enterprise** to enter a custom domain.',
    },
    {
      key: 'custom_host',
      label: 'Self-hosted Host',
      type: 'string',
      required: false,
      helpText:
        'Only for the **Self-hosted / Enterprise** region. Just the domain of your DocSpring install, ' +
        'e.g. `docspring.example.com` (or `http://localhost:3000` for a local install). ' +
        'No path or query string. The install needs a release with API v2.',
    },
    {
      key: 'token_id',
      label: 'API Token ID',
      type: 'string',
      required: true,
      helpText:
        'Your DocSpring API Token ID. Starts with `api_` (live) or `api_test_` (test). ' +
        `Create one on the [API Tokens page](${API_TOKENS_URL}) of your DocSpring dashboard ` +
        '(Settings → API Tokens; for the Europe region, use ' +
        '[app-eu.docspring.com](https://app-eu.docspring.com/api_tokens)). ' +
        `See the [authentication docs](${AUTH_DOCS_URL}).`,
    },
    {
      key: 'token_secret',
      label: 'API Token Secret',
      type: 'password',
      required: true,
      helpText:
        'The API Token Secret shown when you created the token on the ' +
        `[API Tokens page](${API_TOKENS_URL}). It is only displayed once — ` +
        'if you no longer have it, create a new token.',
    },
  ],
}
