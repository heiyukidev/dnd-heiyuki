import { describe, expect, it } from 'vitest'
import { sortSessionsForHome } from './sessionSort'

describe('sortSessionsForHome', () => {
  it('orders by session.createdAt descending', () => {
    const rows = [
      { session: { createdAt: 100 }, label: 'old' },
      { session: { createdAt: 300 }, label: 'new' },
      { session: { createdAt: 200 }, label: 'mid' },
    ]
    expect(sortSessionsForHome(rows).map((r) => r.label)).toEqual(['new', 'mid', 'old'])
  })
})
