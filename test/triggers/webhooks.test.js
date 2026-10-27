'use strict'

const crypto = require('crypto')
const nock = require('nock')
const {
  App,
  appTester,
  authData,
  API,
  apiError,
  errorFrom,
} = require('../helpers')
const { EVENT_TYPES } = require('../../triggers/webhook_events')

const trigger = (key) => App.triggers[key].operation

describe('webhook triggers', () => {
  it('subscribe with a flat API v2 webhook body: v2 event name, no version, filters; keeps the ID and signing secret', async () => {
    let body
    nock(API)
      .post('/api/v2/webhooks', (b) => {
        body = b
        return true
      })
      .reply(201, {
        id: 'whk_1',
        version: 4,
        secret: 'whsec_shh',
        url: 'https://hooks.zapier.com/abc',
      })

    const subscribeData = await appTester(
      trigger('signature_request_completed').performSubscribe,
      {
        authData,
        targetUrl: 'https://hooks.zapier.com/abc',
        inputData: {
          mode: 'live',
          template_ids: ['tpl_1', ''],
          folder_ids: '',
        },
      }
    )

    expect(body).toEqual({
      url: 'https://hooks.zapier.com/abc',
      event_types: ['signature_request.completed'],
      name: 'Zapier: signature_request.completed',
      include_submission_data: true,
      mode: 'live',
      template_ids: ['tpl_1'],
    })
    // The secret verifies each delivery's signature.
    expect(subscribeData).toEqual({ id: 'whk_1', secret: 'whsec_shh' })
  })

  it.each(EVENT_TYPES)('%s subscribes to its own event', async (eventType) => {
    let body
    nock(API)
      .post('/api/v2/webhooks', (b) => {
        body = b
        return true
      })
      .reply(201, { id: 'whk_1' })
    await appTester(trigger(eventType.replace('.', '_')).performSubscribe, {
      authData,
      targetUrl: 'https://hooks.zapier.com/x',
      inputData: {},
    })
    expect(body.event_types).toEqual([eventType])
    expect(body).not.toHaveProperty('version')
    expect(body).not.toHaveProperty('webhook')
  })

  // API v2 can only filter submission, signature request and template events
  // by template (a 422 when the webhook is created). No other trigger offers
  // Templates, but a subscription must never send one it can't take.
  it('says which events the Templates filter applies to', () => {
    const templates = trigger('submission_processed').inputFields.find(
      (f) => f.key === 'template_ids'
    )
    expect(templates.helpText).toMatch(
      /submission, signature request and template events/
    )
    EVENT_TYPES.forEach((eventType) => {
      const offered = trigger(eventType.replace('.', '_')).inputFields.some(
        (f) => f.key === 'template_ids'
      )
      expect([eventType, offered]).toEqual([
        eventType,
        /^(submission|signature_request|template)\./.test(eventType),
      ])
    })
  })

  it('fails before creating a webhook when templates are set for an event they cannot filter', async () => {
    const error = await errorFrom(
      appTester(trigger('combined_pdf_processed').performSubscribe, {
        authData,
        targetUrl: 'https://hooks.zapier.com/x',
        inputData: { template_ids: ['tpl_1'] },
      })
    )
    expect(error.message).toBe(
      'Templates can only filter submission, signature request and template events, ' +
        'not combined_pdf.processed. Remove the templates.'
    )
  })

  it('unsubscribe deletes the webhook by ID', async () => {
    const scope = nock(API)
      .delete('/api/v2/webhooks/whk_1')
      .reply(200, { id: 'whk_1' })
    await appTester(trigger('submission_processed').performUnsubscribe, {
      authData,
      subscribeData: { id: 'whk_1' },
    })
    expect(scope.isDone()).toBe(true)
  })

  it('unsubscribe treats an already-deleted webhook as done', async () => {
    nock(API)
      .delete('/api/v2/webhooks/whk_gone')
      .reply(404, apiError('not_found', 'Webhook not found'))
    await expect(
      appTester(trigger('submission_processed').performUnsubscribe, {
        authData,
        subscribeData: { id: 'whk_gone' },
      })
    ).resolves.toEqual({})
  })

  it('unsubscribe still reports other failures', async () => {
    nock(API)
      .delete('/api/v2/webhooks/whk_1')
      .reply(401, apiError('unauthorized', 'Invalid API token'))
    const error = await errorFrom(
      appTester(trigger('submission_processed').performUnsubscribe, {
        authData,
        subscribeData: { id: 'whk_1' },
      })
    )
    expect(error.message).toMatch(
      /^DocSpring API error 401 unauthorized: Invalid API token/
    )
  })

  it('perform outputs the version 4 event with the event ID as `id`, plus resource_type and resource_id', async () => {
    const delivery = {
      id: 'b7a4c3d2-0000-4000-8000-000000000001',
      event_type: 'combined_pdf.processed',
      created_at: '2026-10-27T09:00:05Z',
      data: {
        id: 'com_1',
        state: 'processed',
        files: { pdf: { download_url: 'https://x/com_1.pdf' } },
      },
    }
    const result = await appTester(trigger('combined_pdf_processed').perform, {
      authData,
      cleanedRequest: delivery,
    })
    expect(result).toEqual([
      { ...delivery, resource_type: 'combined_pdf', resource_id: 'com_1' },
    ])
  })

  it("performList shows recent submissions as events, with the trigger's filters", async () => {
    nock(API)
      .get('/api/v2/submissions')
      .query({
        limit: '10',
        include_data: 'true',
        test: 'true',
        template_id: 'tpl_1',
      })
      .reply(200, {
        data: [
          {
            id: 'sub_1',
            state: 'processed',
            updated_at: '2026-10-27T09:00:05Z',
          },
        ],
        next_cursor: null,
      })
    const result = await appTester(
      trigger('submission_processed').performList,
      {
        authData,
        inputData: { mode: 'test', template_ids: ['tpl_1'] },
      }
    )
    expect(result).toEqual([
      {
        id: 'sample:submission.processed:sub_1',
        event_type: 'submission.processed',
        created_at: '2026-10-27T09:00:05Z',
        data: {
          id: 'sub_1',
          state: 'processed',
          updated_at: '2026-10-27T09:00:05Z',
        },
        resource_type: 'submission',
        resource_id: 'sub_1',
      },
    ])
  })

  it.each([
    ['template_created', '/api/v2/templates', 'template'],
    ['combined_pdf_failed', '/api/v2/combined_pdfs', 'combined_pdf'],
    ['custom_file_created', '/api/v2/custom_files', 'custom_file'],
    ['folder_deleted', '/api/v2/folders', 'folder'],
  ])('%s performList uses %s', async (key, path, resourceType) => {
    nock(API)
      .get(path)
      .query({ limit: '10' })
      .reply(200, { data: [{ id: 'x_1' }], next_cursor: null })
    const result = await appTester(trigger(key).performList, {
      authData,
      inputData: {},
    })
    expect(result[0]).toMatchObject({
      resource_type: resourceType,
      resource_id: 'x_1',
      data: { id: 'x_1' },
    })
  })

  it.each(['signature_request_viewed', 'submission_batch_failed'])(
    '%s performList shows its sample (there is no list endpoint)',
    async (key) => {
      const result = await appTester(trigger(key).performList, {
        authData,
        inputData: {},
      })
      expect(result).toEqual([trigger(key).sample])
    }
  )

  it('every sample is shaped like a delivery for its own event', () => {
    EVENT_TYPES.forEach((eventType) => {
      const sample = trigger(eventType.replace('.', '_')).sample
      expect(sample.event_type).toBe(eventType)
      expect(sample.resource_type).toBe(eventType.split('.')[0])
      expect(sample.resource_id).toBe(sample.data.id)
    })
  })

  describe('signature verification', () => {
    const SECRET = 'whsec_test_secret'
    // The raw body as DocSpring sent it: its key order and spacing differ
    // from what JSON.stringify would make of the parsed object, and it has
    // non-ASCII text.
    const RAW = `{"event_type": "submission.processed",
      "id":"evt_1",  "created_at":"2026-10-27T09:00:05Z",
      "data": {"state":"processed", "id":"sub_1", "data": {"name": "Zoë Ångström"}}}`
    const parsed = JSON.parse(RAW)
    const T = '1782532874'
    const sign = (body, secret = SECRET, t = T) =>
      crypto
        .createHmac('sha256', secret)
        .update(`${t}.${body}`, 'utf8')
        .digest('hex')
    const perform = trigger('submission_processed').perform
    // Zapier's bundle.rawRequest renames headers: `Http-` + Camel-Case.
    const deliver = (
      headers,
      content = RAW,
      subscribeData = { id: 'whk_1', secret: SECRET }
    ) =>
      appTester(perform, {
        authData,
        subscribeData,
        rawRequest: {
          method: 'POST',
          querystring: '',
          headers: { 'Content-Type': 'application/json', ...headers },
          content,
        },
        cleanedRequest: JSON.parse(content),
      })
    const expected = [
      { ...parsed, resource_type: 'submission', resource_id: 'sub_1' },
    ]

    // A dropped delivery is logged with z.console (Zapier's monitoring logs).
    let log
    beforeEach(() => {
      log = jest.spyOn(console, 'log').mockImplementation(() => {})
    })

    it('emits a delivery signed over the exact bytes received', async () => {
      expect(JSON.stringify(parsed)).not.toBe(RAW)
      const result = await deliver({
        'Http-X-Docspring-Signature': `t=${T},v1=${sign(RAW)}`,
      })
      expect(result).toEqual(expected)
    })

    it('reads the header under its own name too, and accepts any matching v1', async () => {
      const result = await deliver({
        'X-DocSpring-Signature': `t=${T},v1=${sign(RAW, 'old_secret')},v1=${sign(RAW)}`,
      })
      expect(result).toEqual(expected)
    })

    it.each([
      [
        'a signature made with another secret',
        () => `t=${T},v1=${sign(RAW, 'whsec_other')}`,
      ],
      [
        'a signature over the re-serialised body',
        () => `t=${T},v1=${sign(JSON.stringify(parsed))}`,
      ],
      [
        'a signature for another timestamp',
        () => `t=1782532875,v1=${sign(RAW)}`,
      ],
      ['no v1', () => `t=${T}`],
      ['no timestamp', () => `v1=${sign(RAW)}`],
    ])('drops a delivery with %s', async (_name, header) => {
      const result = await deliver({ 'Http-X-Docspring-Signature': header() })
      expect(result).toEqual([])
    })

    it('drops a delivery without the header, or whose body was changed', async () => {
      expect(await deliver({})).toEqual([])
      expect(log).toHaveBeenCalledWith(
        expect.stringMatching(
          /^Dropped a webhook delivery: its X-DocSpring-Signature header is missing or doesn't match its body\./
        )
      )
      const changed = RAW.replace('processed', 'failed')
      expect(
        await deliver(
          { 'Http-X-Docspring-Signature': `t=${T},v1=${sign(RAW)}` },
          changed
        )
      ).toEqual([])
    })

    it('emits deliveries for a subscription saved without a secret, unverified', async () => {
      const result = await deliver({}, RAW, { id: 'whk_1' })
      expect(result).toEqual(expected)
    })
  })
})
