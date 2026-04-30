import { describe, it, expect } from 'vitest'

// Mirror of the constant in FragrancePanel.tsx — tests act as a contract
const WEIGHTS = [1.0, 0.8, 0.6, 0.4, 0.2]

function accordBarWidth(index: number): string {
  return `${(WEIGHTS[index] ?? 0) * 100}%`
}

describe('accordBarWidth', () => {
  it('index 0 (most dominant accord) → 100%', () => {
    expect(accordBarWidth(0)).toBe('100%')
  })

  it('index 1 → 80%', () => {
    expect(accordBarWidth(1)).toBe('80%')
  })

  it('index 2 → 60%', () => {
    expect(accordBarWidth(2)).toBe('60%')
  })

  it('index 3 → 40%', () => {
    expect(accordBarWidth(3)).toBe('40%')
  })

  it('index 4 (least dominant) → 20%', () => {
    expect(accordBarWidth(4)).toBe('20%')
  })

  it('index beyond 4 → 0% (no bar)', () => {
    expect(accordBarWidth(5)).toBe('0%')
    expect(accordBarWidth(10)).toBe('0%')
  })
})
