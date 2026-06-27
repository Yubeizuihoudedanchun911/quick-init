import { describe, expect, it } from 'vitest'
import { toIterationSlug } from '../../src/archive/slug.js'

describe('toIterationSlug', () => {
  it('keeps Chinese characters and normalizes punctuation', () => {
    expect(toIterationSlug('支付流程设计：V1 方案')).toBe('支付流程设计-v1-方案')
  })

  it('falls back when title has no usable characters', () => {
    expect(toIterationSlug('---')).toBe('iteration')
  })

  it('truncates titles to 60 characters', () => {
    expect(toIterationSlug('a'.repeat(80))).toBe('a'.repeat(60))
  })

  it('trims trailing dash after truncation', () => {
    expect(toIterationSlug(`${'a'.repeat(59)} - B`)).toBe('a'.repeat(59))
  })
})
