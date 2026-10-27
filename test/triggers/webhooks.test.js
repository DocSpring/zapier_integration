'use strict'

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
  it('subscribe with a flat API v2 webhook body: v2 event name, no version, filters, only the ID kept', async () => {
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
    // Only the webhook ID is stored at Zapier, not its signing secret.
    expect(subscribeData).toEqual({ id: 'whk_1' })
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
})
