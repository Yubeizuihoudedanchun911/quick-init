import { describe, expect, it } from 'vitest'
import { deriveInitializationSpec } from '../../src/init/deriveSpec.js'

describe('deriveInitializationSpec', () => {
  it('derives a full governance spec from a TypeScript SaaS description', () => {
    const spec = deriveInitializationSpec(
      '用 Next.js 14 + Tailwind + Prisma + PostgreSQL 做一个 SaaS 多租户订阅管理平台，需要 Stripe 支付集成和 NextAuth 认证',
      '/tmp/payment-platform'
    )

    expect(spec.project.name).toBe('payment-platform')
    expect(spec.project.domain).toBe('saas')
    expect(spec.project.techStack.language).toBe('typescript')
    expect(spec.project.techStack.framework).toBe('nextjs')
    expect(spec.project.techStack.database).toBe('postgresql')
    expect(spec.project.techStack.orm).toBe('prisma')
    expect(spec.project.integrations).toEqual(expect.arrayContaining(['stripe', 'nextauth']))
    expect(spec.governance.mode).toBe('full')
    expect(spec.tools).toEqual({
      claude: true,
      codex: true,
      cursor: true,
      gemini: true,
      copilot: true,
      windsurf: true
    })
  })

  it('derives Next framework from concise "Next app" intent', () => {
    const spec = deriveInitializationSpec('Next app', '/tmp/next-app')
    expect(spec.project.techStack.framework).toBe('nextjs')
  })

  it('falls back to generic TypeScript project when details are sparse', () => {
    const spec = deriveInitializationSpec('做一个命令行效率工具', '/tmp/quick-init')
    expect(spec.project.name).toBe('quick-init')
    expect(spec.project.domain).toBe('cli')
    expect(spec.project.techStack.language).toBe('typescript')
    expect(spec.project.features).toContain('做一个命令行效率工具')
  })
})
