import path from 'node:path'
import { InitializationSpec } from '../core/types.js'

function includesAny(input: string, words: string[]): boolean {
  return words.some((word) => input.includes(word))
}

function stripGenericPrefix(input: string): string {
  return input.replace(/^做一个\s*/, '').trim()
}

function projectNameFromCwd(cwd: string): string {
  return path.basename(cwd).trim() || 'quick-init-project'
}

export function deriveInitializationSpec(description: string, cwd: string): InitializationSpec {
  const normalized = description.trim()
  const feature = stripGenericPrefix(normalized)
  const lower = normalized.toLowerCase()

  const framework =
    includesAny(lower, ['next.js', 'nextjs']) ? 'nextjs'
    : includesAny(lower, ['express']) ? 'express'
    : includesAny(lower, ['fastapi']) ? 'fastapi'
    : undefined

  const language =
    includesAny(lower, ['python', 'fastapi']) ? 'python'
    : includesAny(lower, ['rust']) ? 'rust'
    : 'typescript'

  const domain =
    includesAny(lower, ['saas', '多租户', '订阅']) ? 'saas'
    : includesAny(lower, ['cli', '命令行']) ? 'cli'
    : includesAny(lower, ['电商', 'ecommerce']) ? 'ecommerce'
    : 'app'

  const database =
    includesAny(lower, ['postgres', 'postgresql']) ? 'postgresql'
    : includesAny(lower, ['mysql']) ? 'mysql'
    : includesAny(lower, ['mongodb']) ? 'mongodb'
    : undefined

  const orm =
    includesAny(lower, ['prisma']) ? 'prisma'
    : includesAny(lower, ['drizzle']) ? 'drizzle'
    : undefined

  const integrations = [
    includesAny(lower, ['stripe']) ? 'stripe' : '',
    includesAny(lower, ['nextauth', 'next auth']) ? 'nextauth' : ''
  ].filter(Boolean) as string[]

  return {
    project: {
      name: projectNameFromCwd(cwd),
      description: normalized,
      domain,
      techStack: {
        language,
        runtime: language === 'typescript' ? 'node' : undefined,
        framework,
        packageManager: language === 'typescript' ? 'npm' : undefined,
        database,
        orm,
        testing: language === 'typescript' ? ['vitest'] : undefined
      },
      features: [feature],
      integrations
    },
    governance: {
      mode: 'full',
      codingRules: true,
      commitRules: true,
      iterationArchive: true,
      docsSync: true,
      documentationSubagent: true,
      architectureDecisionRecords: true
    },
    tools: {
      claude: true,
      codex: true,
      cursor: true,
      gemini: true,
      copilot: true,
      windsurf: true
    },
    automation: {
      gitHooks: true,
      claudeHooks: true,
      docArchiveCommand: true,
      cheapModelDocSummary: true,
      fallbackToManifestOnly: true
    }
  }
}
