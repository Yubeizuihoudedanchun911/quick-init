import { describe, expect, it } from 'vitest'
import { deriveInitializationSpec } from '../../src/init/deriveSpec.js'
import { buildGeneratedFiles } from '../../src/init/generatedFiles.js'

describe('buildGeneratedFiles', () => {
  it('generates full governance files without development workflow subagents', () => {
    const spec = deriveInitializationSpec('TypeScript CLI 工具', '/tmp/quick-init')
    const files = buildGeneratedFiles(spec)
    const paths = files.map((file) => file.path)
    const settings = files.find((file) => file.path === '.claude/settings.json')
    const domainRule = files.find((file) => file.path === '.cursor/rules/domain.mdc')

    expect(paths).toContain('CLAUDE.md')
    expect(paths).toContain('AGENTS.md')
    expect(paths).toContain('GEMINI.md')
    expect(paths).toContain('.windsurfrules')
    expect(paths).toContain('.cursor/rules/general.mdc')
    expect(paths).toContain('.cursor/rules/domain.mdc')
    expect(paths).toContain('.claude/settings.json')
    expect(paths).toContain('.github/copilot-instructions.md')
    expect(paths).toContain('.coding-rules/style.md')
    expect(paths).toContain('.coding-rules/documentation.md')
    expect(paths).toContain('agents/documentation.md')
    expect(paths).toContain('docs/specs/_README.md')
    expect(paths).toContain('docs/iterations/_README.md')

    expect(settings).toBeDefined()
    expect(settings?.commit).toBe(true)
    const settingsContent = settings ? JSON.parse(settings.content) : {}
    expect(settingsContent).toMatchObject({
      hooks: {},
      permissions: {}
    })
    expect(settingsContent.quickInitArchiveIntent).toContain('quick-init')
    expect(settingsContent.quickInitArchiveIntent).toContain('quick-init workflows')

    expect(domainRule).toBeDefined()
    expect(domainRule?.commit).toBe(true)
    expect(domainRule?.content).toContain('---')
    expect(domainRule?.content).toContain('Project domain: cli')
    expect(domainRule?.content).toContain(spec.project.domain)
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
