'use strict'

const { flattenDelivery, toDeliveryShape } = require('../../lib/payload')

describe('flattenDelivery', () => {
  const body = {
    id: 'evt_abc',
    event: 'submission.processed',
    timestamp: '2026-06-30T12:00:00Z',
    data: {
      resource: { type: 'Submission', id: 'sub_123' },
      id: 'sub_123',
      state: 'processed',
      download_url: 'https://example.com/x.pdf',
    },
  }

  it('keeps the event id as the top-level (dedup) id', () => {
    expect(flattenDelivery(body).id).toBe('evt_abc')
  })

  it('never lets the resource id clobber the event id', () => {
    // The dedup guarantee: even though data.id === sub_123, the top-level id
    // must remain the event uuid.
    const result = flattenDelivery(body)
    expect(result.id).toBe('evt_abc')
    expect(result.resource_id).toBe('sub_123')
  })

  it('spreads resource fields to the top level and exposes resource_type', () => {
    const result = flattenDelivery(body)
    expect(result.resource_type).toBe('Submission')
    expect(result.state).toBe('processed')
    expect(result.download_url).toBe('https://example.com/x.pdf')
  })

  it('does not leak the nested resource ref object', () => {
    expect(flattenDelivery(body).resource).toBeUndefined()
  })

  it('falls back to resource.id when data has no own id', () => {
    const result = flattenDelivery({
      id: 'evt_1',
      data: { resource: { type: 'Template', id: 'tpl_9' }, name: 'X' },
    })
    expect(result.resource_id).toBe('tpl_9')
    expect(result.name).toBe('X')
  })

  it('tolerates an empty/undefined body', () => {
    expect(() => flattenDelivery(undefined)).not.toThrow()
    expect(flattenDelivery(undefined).id).toBeUndefined()
  })
})

describe('toDeliveryShape', () => {
  it('wraps a plain resource so it flattens identically to a live delivery', () => {
    const flattened = flattenDelivery(
      toDeliveryShape(
        'Submission',
        { id: 'sub_1', state: 'processed' },
        'submission.processed'
      )
    )
    expect(flattened.resource_type).toBe('Submission')
    expect(flattened.resource_id).toBe('sub_1')
    expect(flattened.state).toBe('processed')
    expect(flattened.event).toBe('submission.processed')
  })
})
