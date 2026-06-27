import { describe, expect, it } from 'vitest'
import { classifyMarkdown, extractMarkdownTitle } from '../../src/archive/classifier.js'

describe('extractMarkdownTitle', () => {
  it('returns the first H1 title', () => {
    expect(extractMarkdownTitle('# 支付流程设计\n\nbody')).toBe('支付流程设计')
  })
})

describe('classifyMarkdown', () => {
  it('archives specs documents', () => {
    const doc = classifyMarkdown('docs/specs/payment.md', '# Payment Spec\n')
    expect(doc.action).toBe('archive')
    expect(doc.category).toBe('specs')
  })

  it('summarizes long-lived architecture docs without moving them', () => {
    const doc = classifyMarkdown('docs/architecture.md', '# Architecture\n')
    expect(doc.action).toBe('summarize-only')
    expect(doc.archivePath).toBeNull()
  })

  it('skips workspace readme files', () => {
    const doc = classifyMarkdown('docs/specs/_README.md', '# Specs Workspace\n')
    expect(doc.action).toBe('skip')
  })
})
