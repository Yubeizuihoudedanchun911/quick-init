import { describe, expect, it } from 'vitest'
import { deriveInitializationSpec } from '../../src/init/deriveSpec.js'
import { buildGeneratedFiles } from '../../src/init/generatedFiles.js'

describe('buildGeneratedFiles', () => {
  it('generates full governance files without development workflow subagents', () => {
    const spec = deriveInitializationSpec('TypeScript CLI 工具', '/tmp/quick-init')
    const files = buildGeneratedFiles(spec)
    const paths = files.map((file) => file.path)

    expect(paths).toContain('CLAUDE.md')
    expect(paths).toContain('AGENTS.md')
    expect(paths).toContain('GEMINI.md')
    expect(paths).toContain('.windsurfrules')
    expect(paths).toContain('.cursor/rules/general.mdc')
    expect(paths).toContain('.github/copilot-instructions.md')
    expect(paths).toContain('.coding-rules/style.md')
    expect(paths).toContain('.coding-rules/documentation.md')
    expect(paths).toContain('agents/documentation.md')
    expect(paths).toContain('docs/specs/_README.md')
    expect(paths).toContain('docs/iterations/_README.md')
    expect(paths).not.toContain('agents/implementation.md')
    expect(paths).not.toContain('agents/debugging.md')
    expect(paths).not.toContain('agents/review.md')
  })

  it('does not generate local .quick-init runtime files as commit files', () => {
    const spec = deriveInitializationSpec('Next.js app', '/tmp/app')
    const paths = buildGeneratedFiles(spec).map((file) => file.path)
    expect(paths.some((item) => item.startsWith('.quick-init/'))).toBe(false)
  })
})
