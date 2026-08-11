import { describe, expect, it } from 'vitest'

import { displayNumber } from './displayNumber'

describe('displayNumber', () => {
  it('formats integers with one decimal place', () => {
    expect(displayNumber(5)).toBe('5.0')
  })

  it('formats fractions with one decimal place', () => {
    expect(displayNumber(5.6)).toBe('5.6')
  })

  it('rounds to one decimal place', () => {
    expect(displayNumber(5.67)).toBe('5.7')
  })
})
