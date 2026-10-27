'use strict'

const { eventFromDelivery } = require('../../lib/payload')

// A version 4 delivery body (webhook-payloads.mdx, "Version 4").
const delivery = {
  id: '6f1c2e8a-3b4d-4c5e-9f60-7a8b9c0d1e2f',
  event_type: 'submission.processed',
  created_at: '2026-06-27T03:16:07Z',
  data: {
    id: 'sub_1234567890abcdef01',
    state: 'processed',
    created_at: '2026-06-27T03:16:00Z',
    files: { pdf: { download_url: 'https://downloads.docspring.com/x.pdf' } },
  },
}

describe('eventFromDelivery', () => {
  it('keeps the event ID as the top-level (dedup) id', () => {
    expect(eventFromDelivery(delivery).id).toBe(
      '6f1c2e8a-3b4d-4c5e-9f60-7a8b9c0d1e2f'
    )
  })

  it('adds resource_type and resource_id without touching the event or the resource', () => {
    expect(eventFromDelivery(delivery)).toEqual({
      ...delivery,
      resource_type: 'submission',
      resource_id: 'sub_1234567890abcdef01',
    })
  })

  it("names the resource from the event's first part", () => {
    expect(
      eventFromDelivery({
        ...delivery,
        event_type: 'signature_request.completed',
        data: { id: 'srq_1' },
      })
    ).toMatchObject({
      resource_type: 'signature_request',
      resource_id: 'srq_1',
    })
    expect(
      eventFromDelivery({
        ...delivery,
        event_type: 'combined_pdf.failed',
        data: { id: 'com_1' },
      }).resource_type
    ).toBe('combined_pdf')
  })

  it('tolerates an empty body', () => {
    expect(eventFromDelivery(undefined)).toEqual({
      resource_type: null,
      resource_id: null,
    })
  })
})
