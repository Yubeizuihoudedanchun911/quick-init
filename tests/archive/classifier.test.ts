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

  it('classifies coding-rules markdown as summarize-only rules', () => {
    const doc = classifyMarkdown('.coding-rules/style.md', '# Coding Style\n')
    expect(doc.action).toBe('summarize-only')
    expect(doc.category).toBe('rules')
    expect(doc.archivePath).toBeNull()
  })

  it.each(['AGENTS.md', 'CLAUDE.md'])(
    'classifies %s as summarize-only tooling',
    (filename) => {
      const doc = classifyMarkdown(filename, '# Tooling Instructions\n')
      expect(doc.action).toBe('summarize-only')
      expect(doc.category).toBe('tooling')
      expect(doc.archivePath).toBeNull()
    },
  )

  it('classifies unknown markdown as summarize-only unknown', () => {
    const doc = classifyMarkdown('notes/random.md', '# Random Notes\n')
    expect(doc.action).toBe('summarize-only')
    expect(doc.category).toBe('unknown')
    expect(doc.archivePath).toBeNull()
  })

  it('emits stable sha256 for summarize-only branches', () => {
    const sample = '# Same Content\n'
    const changed = '# Different Content\n'

    const docFromRulesA = classifyMarkdown('.coding-rules/style.md', sample)
    const docFromRulesB = classifyMarkdown('.coding-rules/style.md', sample)
    expect(docFromRulesA.sha256).toBe(docFromRulesB.sha256)
    expect(docFromRulesA.sha256).not.toBe(classifyMarkdown('.coding-rules/style.md', changed).sha256)

    const docFromToolingA = classifyMarkdown('AGENTS.md', sample)
    const docFromToolingB = classifyMarkdown('AGENTS.md', sample)
    expect(docFromToolingA.sha256).toBe(docFromToolingB.sha256)
    expect(docFromToolingA.sha256).not.toBe(classifyMarkdown('AGENTS.md', changed).sha256)

    const docFromUnknownA = classifyMarkdown('notes/random.md', sample)
    const docFromUnknownB = classifyMarkdown('notes/random.md', sample)
    expect(docFromUnknownA.sha256).toBe(docFromUnknownB.sha256)
    expect(docFromUnknownA.sha256).not.toBe(classifyMarkdown('notes/random.md', changed).sha256)

    for (const hash of [
      docFromRulesA.sha256,
      docFromToolingA.sha256,
      docFromUnknownA.sha256,
    ]) {
      expect(hash).toMatch(/^[0-9a-f]{64}$/)
    }
  })
})
