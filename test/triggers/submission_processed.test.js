'use strict'

const nock = require('nock')
const zapier = require('zapier-platform-core')
const App = require('../../index')

const appTester = zapier.createAppTester(App)
const authData = {
  region: 'us',
  token_id: 'api_test_abc',
  token_secret: 'sekret',
}
const trigger = App.triggers.submission_processed.operation

describe('submission_processed trigger', () => {
  afterEach(() => nock.cleanAll())

  it('subscribes with version 3, the event type, target URL, and scope', async () => {
    let captured
    nock('https://api.docspring.com')
      .post('/api/v1/webhooks', (body) => {
        captured = body
        return true
      })
      .reply(201, { uid: 'whk_1' })

    const bundle = {
      authData,
      targetUrl: 'https://hooks.zapier.com/abc',
      inputData: { mode: 'live', template_uids: ['tpl_1'] },
    }
    const result = await appTester(trigger.performSubscribe, bundle)

    expect(result.uid).toBe('whk_1')
    expect(captured.webhook.version).toBe(3)
    expect(captured.webhook.event_types).toEqual(['submission.processed'])
    expect(captured.webhook.url).toBe('https://hooks.zapier.com/abc')
    expect(captured.webhook.mode).toBe('live')
    expect(captured.webhook.template_uids).toEqual(['tpl_1'])
  })

  it('unsubscribes by webhook uid', async () => {
    const scope = nock('https://api.docspring.com')
      .delete('/api/v1/webhooks/whk_1')
      .reply(204)
    await appTester(trigger.performUnsubscribe, {
      authData,
      subscribeData: { uid: 'whk_1' },
    })
    expect(scope.isDone()).toBe(true)
  })

  it('tolerates unsubscribing a webhook that was already deleted', async () => {
    nock('https://api.docspring.com')
      .delete('/api/v1/webhooks/whk_gone')
      .reply(404, { status: 'error', error: 'Webhook not found' })

    await expect(
      appTester(trigger.performUnsubscribe, {
        authData,
        subscribeData: { uid: 'whk_gone' },
      })
    ).resolves.toEqual({})
  })

  it('still surfaces non-404 unsubscribe failures', async () => {
    nock('https://api.docspring.com')
      .delete('/api/v1/webhooks/whk_1')
      .reply(401, {})

    await expect(
      appTester(trigger.performUnsubscribe, {
        authData,
        subscribeData: { uid: 'whk_1' },
      })
    ).rejects.toThrow(/Invalid DocSpring API token/)
  })

  it('flattens an inbound delivery (perform)', async () => {
    const bundle = {
      authData,
      cleanedRequest: {
        id: 'evt_1',
        event: 'submission.processed',
        timestamp: '2026-06-30T12:00:00Z',
        data: {
          resource: { type: 'Submission', id: 'sub_1' },
          id: 'sub_1',
          state: 'processed',
        },
      },
    }
    const result = await appTester(trigger.perform, bundle)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('evt_1')
    expect(result[0].resource_id).toBe('sub_1')
    expect(result[0].state).toBe('processed')
  })

  it('lists recent submissions for the test step (performList)', async () => {
    nock('https://api.docspring.com')
      .get('/api/v1/submissions')
      .query(true)
      .reply(200, { submissions: [{ id: 'sub_1', state: 'processed' }] })
    const result = await appTester(trigger.performList, {
      authData,
      inputData: {},
    })
    expect(result[0].resource_type).toBe('Submission')
    expect(result[0].resource_id).toBe('sub_1')
  })
})
