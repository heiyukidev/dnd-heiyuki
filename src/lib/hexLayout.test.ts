import { describe, expect, it } from 'vitest'
import { hexCenterPx, hexLayoutBounds } from './hexLayout'

describe('hexCenterPx', () => {
  it('moves right when column increases', () => {
    const s = 20
    const a = hexCenterPx(0, 0, s)
    const b = hexCenterPx(1, 0, s)
    expect(b.x).toBeGreaterThan(a.x)
  })

  it('staggers odd rows horizontally', () => {
    const s = 20
    const a = hexCenterPx(0, 0, s)
    const b = hexCenterPx(0, 1, s)
    expect(b.y).toBeGreaterThan(a.y)
    expect(b.x).not.toBe(a.x)
  })
})

describe('hexLayoutBounds', () => {
  it('returns positive dimensions for a small grid', () => {
    const b = hexLayoutBounds(3, 3, 18, 8)
    expect(b.width).toBeGreaterThan(0)
    expect(b.height).toBeGreaterThan(0)
  })
})
