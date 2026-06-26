# Quick Init Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript/Node.js Claude Code Skill and CLI that initializes a full vibecoding governance layer, installs archive hooks, and automatically archives staged Markdown into iteration history.

**Architecture:** The CLI is the deterministic execution surface: `init` creates governance files and scoped commits them, `archive --staged` classifies staged Markdown and moves archiveable documents, and `iteration` manages local active iteration state. AI-generated content is isolated behind a summary adapter with deterministic manifest-only fallback, so Git hooks remain reliable.

**Tech Stack:** Node.js 20+, TypeScript, Vitest, built-in `fs/promises`, `child_process`, `crypto`, and no runtime framework dependency for the CLI parser.

## Global Constraints

- Default governance mode is `full`; do not add light, standard, or strict modes.
- `quick-init init "<业务描述>"`, `quick-init archive --staged`, `quick-init iteration status`, `quick-init iteration start "<name>"`, and `quick-init iteration close` are the required command surfaces.
- `.quick-init/**` is local runtime state and must be added to `.gitignore`; it must not be committed by quick-init scoped commits.
- Shared facts live in generated docs, `.coding-rules/**`, AI tool entry files, and `docs/iterations/**/manifest.json`.
- The only default subagent file is `agents/documentation.md`; do not generate implementation, debugging, or review subagents by default.
- The Git hook must call `quick-init archive --staged`; complex archive logic belongs in the CLI.
- Code commits without staged Markdown are allowed; archive command must not block them.
- AI summary failure must degrade to manifest-only archive and allow the commit to continue.
- File moves or staging failures during archive must block the commit to avoid half-archived state.
- Dirty repositories are supported through scoped staging only; never use `git add -A`.

---

## File Structure

Create these implementation files:

```text
SKILL.md
package.json
tsconfig.json
vitest.config.ts
src/
  cli.ts
  core/
    errors.ts
    paths.ts
    types.ts
  init/
    deriveSpec.ts
    generatedFiles.ts
    initCommand.ts
    initialArchive.ts
  templates/
    aiTools.ts
    codingRules.ts
    docs.ts
    scripts.ts
  local/
    config.ts
    gitignore.ts
    state.ts
  git/
    git.ts
    hooks.ts
    scopedCommit.ts
  archive/
    activeIteration.ts
    archiveCommand.ts
    classifier.ts
    iterationText.ts
    manifest.ts
    markdown.ts
    slug.ts
  ai/
    summary.ts
  iteration/
    commands.ts
tests/
  helpers/
    tempRepo.ts
  init/
    deriveSpec.test.ts
    generatedFiles.test.ts
    initCommand.test.ts
  local/
    config.test.ts
    state.test.ts
  git/
    hooks.test.ts
    scopedCommit.test.ts
  archive/
    classifier.test.ts
    archiveCommand.test.ts
    slug.test.ts
  iteration/
    commands.test.ts
  cli.test.ts
```

Responsibilities:

- `src/cli.ts`: parse arguments and dispatch commands.
- `src/core/types.ts`: shared contracts for specs, generated files, archive manifests, and command results.
- `src/init/*`: derive initialization spec, render generated files, create initial archive, and orchestrate init.
- `src/templates/*`: deterministic content generators for governance docs, rules, AI tool files, and script stubs.
- `src/local/*`: read/write `.quick-init/config.json`, `.quick-init/state/**`, and `.gitignore`.
- `src/git/*`: small Git wrapper, hook installer, and scoped commit helper.
- `src/archive/*`: staged Markdown inspection, classification, slug generation, active iteration matching, manifest writing, file moves, and staging.
- `src/ai/summary.ts`: optional AI summary boundary with deterministic degraded fallback.
- `src/iteration/commands.ts`: `status`, `start`, and `close` local iteration commands.

### Task 1: TypeScript CLI Skeleton And Shared Types

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/cli.ts`
- Create: `src/core/errors.ts`
- Create: `src/core/paths.ts`
- Create: `src/core/types.ts`
- Create: `tests/helpers/tempRepo.ts`
- Create: `tests/cli.test.ts`

**Interfaces:**
- Produces: `runCli(argv: string[], cwd: string): Promise<CommandResult>`
- Produces: `CommandResult`, `InitializationSpec`, `GeneratedFile`, `ArchiveManifest`, `ArchiveRun`, `ArchiveDocument`, `LocalConfig`
- Consumes: no prior implementation files

- [ ] **Step 1: Create project package metadata**

Write `package.json` with these scripts and binary entry:

```json
{
  "name": "quick-init",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": {
    "quick-init": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "tsx": "^4.16.0",
    "typescript": "^5.5.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create TypeScript and Vitest config**

Write `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "rootDir": ".",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

Write `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
})
```

- [ ] **Step 3: Write shared type contracts**

Create `src/core/types.ts` with the exported contracts used by later tasks:

```ts
export interface CommandResult {
  ok: boolean
  message: string
  changedFiles?: string[]
}

export interface InitializationSpec {
  project: {
    name: string
    description: string
    domain: string
    techStack: {
      language: string
      runtime?: string
      framework?: string
      packageManager?: string
      database?: string
      orm?: string
      testing?: string[]
      deployment?: string
    }
    features: string[]
    integrations: string[]
  }
  governance: {
    mode: 'full'
    codingRules: true
    commitRules: true
    iterationArchive: true
    docsSync: true
    documentationSubagent: true
    architectureDecisionRecords: true
  }
  tools: {
    claude: true
    codex: true
    cursor: true
    gemini: true
    copilot: true
    windsurf: true
  }
  automation: {
    gitHooks: true
    claudeHooks: true
    docArchiveCommand: true
    cheapModelDocSummary: true
    fallbackToManifestOnly: true
  }
}

export interface GeneratedFile {
  path: string
  content: string
  commit: boolean
}

export interface LocalConfig {
  archive: {
    enabled: boolean
    autoStage: boolean
    aiSummary: boolean
    model: 'cheap'
    timeoutMs: number
    fallbackToManifestOnly: boolean
  }
  hooks: {
    preCommitArchive: boolean
  }
}

export type ArchiveAction = 'archive' | 'keep' | 'summarize-only' | 'skip'
export type ArchiveCategory = 'specs' | 'designs' | 'verification' | 'decisions' | 'research' | 'rules' | 'tooling' | 'project' | 'unknown'
export type SummaryStatus = 'ok' | 'degraded' | 'generated'

export interface ArchiveDocument {
  sourcePath: string
  archivePath: string | null
  category: ArchiveCategory
  action: ArchiveAction
  reason: string
  sha256?: string
}

export interface ArchiveRun {
  runId: string
  commit: 'pending' | string
  documents: ArchiveDocument[]
}

export interface ArchiveManifest {
  iteration: string
  status: 'active' | 'closed'
  summaryStatus: SummaryStatus
  slugSource: {
    type: 'markdown-title' | 'filename' | 'content-field' | 'commit-message' | 'fallback'
    path?: string
    title: string
  }
  archiveRuns: ArchiveRun[]
}
```

- [ ] **Step 4: Add errors and path helpers**

Create `src/core/errors.ts`:

```ts
export class QuickInitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QuickInitError'
  }
}
```

Create `src/core/paths.ts`:

```ts
import path from 'node:path'

export function toPosixPath(input: string): string {
  return input.split(path.sep).join('/')
}

export function repoPath(cwd: string, relativePath: string): string {
  return path.join(cwd, relativePath)
}
```

- [ ] **Step 5: Write CLI dispatch tests first**

Create `tests/cli.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mkdtemp } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { runCli } from '../src/cli.js'

async function tempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'quick-init-cli-'))
}

describe('runCli', () => {
  it('prints help for missing command', async () => {
    const cwd = await tempDir()
    const result = await runCli([], cwd)
    expect(result.ok).toBe(false)
    expect(result.message).toContain('Usage: quick-init')
  })

  it('rejects unknown commands', async () => {
    const cwd = await tempDir()
    const result = await runCli(['unknown'], cwd)
    expect(result.ok).toBe(false)
    expect(result.message).toContain('Unknown command: unknown')
  })
})
```

- [ ] **Step 6: Implement minimal CLI dispatch**

Create `src/cli.ts`:

```ts
#!/usr/bin/env node
import { CommandResult } from './core/types.js'

function usage(): string {
  return [
    'Usage: quick-init <command>',
    'Commands:',
    '  init "<业务描述>"',
    '  archive --staged',
    '  iteration status',
    '  iteration start "<name>"',
    '  iteration close'
  ].join('\n')
}

export async function runCli(argv: string[], cwd: string = process.cwd()): Promise<CommandResult> {
  const [command] = argv
  if (!command) {
    return { ok: false, message: usage() }
  }
  if (!['init', 'archive', 'iteration'].includes(command)) {
    return { ok: false, message: `Unknown command: ${command}` }
  }
  return { ok: false, message: `Command not wired yet: ${command} in ${cwd}` }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runCli(process.argv.slice(2), process.cwd())
  console.log(result.message)
  process.exit(result.ok ? 0 : 1)
}
```

- [ ] **Step 7: Run tests and typecheck**

Run:

```bash
npm install
npm test -- tests/cli.test.ts
npm run typecheck
```

Expected:

```text
2 tests passed
typecheck exits 0
```

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts src tests
git commit -m "chore: scaffold quick-init cli"
```

### Task 2: Initialization Spec Derivation

**Files:**
- Create: `src/init/deriveSpec.ts`
- Create: `tests/init/deriveSpec.test.ts`
- Modify: `src/core/types.ts`

**Interfaces:**
- Consumes: `InitializationSpec`
- Produces: `deriveInitializationSpec(description: string, cwd: string): InitializationSpec`

- [ ] **Step 1: Write failing tests for natural-language derivation**

Create `tests/init/deriveSpec.test.ts`:

```ts
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

  it('falls back to generic TypeScript project when details are sparse', () => {
    const spec = deriveInitializationSpec('做一个命令行效率工具', '/tmp/quick-init')
    expect(spec.project.name).toBe('quick-init')
    expect(spec.project.domain).toBe('cli')
    expect(spec.project.techStack.language).toBe('typescript')
    expect(spec.project.features).toContain('命令行效率工具')
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/init/deriveSpec.test.ts
```

Expected: FAIL because `src/init/deriveSpec.ts` does not exist.

- [ ] **Step 3: Implement deterministic derivation**

Create `src/init/deriveSpec.ts`:

```ts
import path from 'node:path'
import { InitializationSpec } from '../core/types.js'

function includesAny(input: string, words: string[]): boolean {
  return words.some((word) => input.toLowerCase().includes(word.toLowerCase()))
}

function projectNameFromCwd(cwd: string): string {
  return path.basename(cwd).trim() || 'quick-init-project'
}

export function deriveInitializationSpec(description: string, cwd: string): InitializationSpec {
  const normalized = description.trim()
  const lower = normalized.toLowerCase()

  const framework = includesAny(lower, ['next.js', 'nextjs', 'next ']) ? 'nextjs'
    : includesAny(lower, ['express']) ? 'express'
    : includesAny(lower, ['fastapi']) ? 'fastapi'
    : undefined

  const language = includesAny(lower, ['python', 'fastapi']) ? 'python'
    : includesAny(lower, ['rust']) ? 'rust'
    : 'typescript'

  const domain = includesAny(lower, ['saas', '多租户', '订阅']) ? 'saas'
    : includesAny(lower, ['cli', '命令行']) ? 'cli'
    : includesAny(lower, ['电商', 'ecommerce']) ? 'ecommerce'
    : 'app'

  const database = includesAny(lower, ['postgres', 'postgresql']) ? 'postgresql'
    : includesAny(lower, ['mysql']) ? 'mysql'
    : includesAny(lower, ['mongodb']) ? 'mongodb'
    : undefined

  const orm = includesAny(lower, ['prisma']) ? 'prisma'
    : includesAny(lower, ['drizzle']) ? 'drizzle'
    : undefined

  const integrations = [
    includesAny(lower, ['stripe']) ? 'stripe' : '',
    includesAny(lower, ['nextauth', 'next auth']) ? 'nextauth' : ''
  ].filter(Boolean)

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
      features: [normalized],
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
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- tests/init/deriveSpec.test.ts
npm run typecheck
```

Expected: tests and typecheck pass.

- [ ] **Step 5: Commit**

```bash
git add src/init/deriveSpec.ts tests/init/deriveSpec.test.ts src/core/types.ts
git commit -m "feat: derive initialization spec"
```

### Task 3: Governance File Generation

**Files:**
- Create: `src/init/generatedFiles.ts`
- Create: `src/templates/aiTools.ts`
- Create: `src/templates/codingRules.ts`
- Create: `src/templates/docs.ts`
- Create: `src/templates/scripts.ts`
- Create: `tests/init/generatedFiles.test.ts`

**Interfaces:**
- Consumes: `InitializationSpec`, `GeneratedFile`
- Produces: `buildGeneratedFiles(spec: InitializationSpec): GeneratedFile[]`

- [ ] **Step 1: Write failing tests for generated file list**

Create `tests/init/generatedFiles.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/init/generatedFiles.test.ts
```

Expected: FAIL because `buildGeneratedFiles` does not exist.

- [ ] **Step 3: Implement deterministic templates**

Create `src/templates/aiTools.ts`:

```ts
import { InitializationSpec } from '../core/types.js'

export function claudeInstructions(spec: InitializationSpec): string {
  return `# ${spec.project.name} Claude Code Instructions

Use the shared rules in .coding-rules/.
Before changing files, understand the relevant docs and current git status.
When Markdown documents are staged, quick-init archive will classify and move them into docs/iterations/.
`
}

export function codexInstructions(spec: InitializationSpec): string {
  return `# AGENTS.md

请使用中文进行回复。
Follow .coding-rules/ as the shared project rule source.
The default documentation subagent is agents/documentation.md.
`
}

export function geminiInstructions(spec: InitializationSpec): string {
  return `# ${spec.project.name} Gemini CLI Instructions

Follow .coding-rules/ and preserve docs/iterations manifests as shared facts.
`
}

export function windsurfRules(spec: InitializationSpec): string {
  return `Follow .coding-rules/ for ${spec.project.name}. Keep .quick-init/ local and uncommitted.`
}

export function cursorGeneralRule(spec: InitializationSpec): string {
  return `---
description: Shared quick-init governance rules
globs:
  - "**/*"
alwaysApply: true
---

Use .coding-rules/ as the shared project rule source for ${spec.project.name}.
`
}

export function copilotInstructions(spec: InitializationSpec): string {
  return `# Copilot Instructions

Project: ${spec.project.name}
Use .coding-rules/ as the shared rule source.
`
}
```

Create `src/templates/codingRules.ts`:

```ts
import { InitializationSpec } from '../core/types.js'

export function codingRuleFiles(spec: InitializationSpec): Array<[string, string]> {
  return [
    ['.coding-rules/style.md', `# Style Rules

- Keep modules cohesive and small.
- Prefer clear TypeScript types over implicit object shapes.
- Avoid unrelated refactors during focused changes.
`],
    ['.coding-rules/architecture.md', `# Architecture Rules

- Hard skeleton is deterministic.
- Soft documentation content may be generated by AI.
- Git hooks call quick-init commands instead of embedding business logic.
`],
    ['.coding-rules/testing.md', `# Testing Rules

- Add focused Vitest coverage for every behavior change.
- Use temporary Git repositories for Git behavior tests.
- Verify staged file behavior with real git commands.
`],
    ['.coding-rules/security.md', `# Security Rules

- Do not commit local .quick-init runtime state.
- Do not leak model credentials in generated docs or manifests.
`],
    ['.coding-rules/git-workflow.md', `# Git Workflow Rules

- Use scoped staging only.
- Never use git add -A in quick-init automation.
- Preserve unrelated dirty work.
`],
    ['.coding-rules/documentation.md', `# Documentation Rules

- Markdown submitted with a commit may be classified and archived.
- If classification is uncertain, use summarize-only.
- Manifest files are the machine-readable facts.
`]
  ]
}
```

Create `src/templates/docs.ts`:

```ts
import { InitializationSpec } from '../core/types.js'

export function documentationFiles(spec: InitializationSpec): Array<[string, string]> {
  return [
    ['docs/architecture.md', `# Architecture

Project: ${spec.project.name}

This file tracks durable architecture facts for the project.
`],
    ['docs/tech-stack.md', `# Tech Stack

- Language: ${spec.project.techStack.language}
- Runtime: ${spec.project.techStack.runtime ?? 'not specified'}
- Framework: ${spec.project.techStack.framework ?? 'not specified'}
`],
    ['docs/changelog.md', `# Changelog

Changes are summarized from iteration archives.
`],
    ['docs/specs/_README.md', '# Specs Workspace\n\nPlace staged feature specs here before archive.\n'],
    ['docs/designs/_README.md', '# Designs Workspace\n\nPlace staged design documents here before archive.\n'],
    ['docs/verification/_README.md', '# Verification Workspace\n\nPlace staged verification documents here before archive.\n'],
    ['docs/decisions/_README.md', '# Decisions Workspace\n\nPlace staged ADR documents here before archive.\n'],
    ['docs/research/_README.md', '# Research Workspace\n\nPlace staged research documents here before archive.\n'],
    ['docs/iterations/_README.md', '# Iterations\n\nArchived iteration records live here.\n']
  ]
}

export function documentationAgentFile(): [string, string] {
  return ['agents/documentation.md', `# Documentation Subagent

Purpose: classify staged Markdown, move archiveable documents into docs/iterations/, update iteration.md and manifest.json, and preserve evidence.

Allowed writes:
- docs/**

Disallowed writes:
- source code
- tests
- dependency files
- .quick-init/**

When evidence is missing, write "未确认" or "无法判断" instead of inventing details.
`]
}
```

Create `src/templates/scripts.ts`:

```ts
export function hookScriptFiles(): Array<[string, string]> {
  return [
    ['scripts/hooks/install_git_hooks.ts', 'export const hookCommand = "quick-init archive --staged"\\n'],
    ['scripts/hooks/archive_iteration.ts', 'export const archiveCommand = "quick-init archive --staged"\\n'],
    ['scripts/hooks/check_iteration_docs.ts', 'export const checkCommand = "quick-init archive --staged"\\n'],
    ['scripts/hooks/prepare_commit_summary.ts', 'export const prepareCommitSummary = true\\n']
  ]
}
```

- [ ] **Step 4: Implement generated file builder**

Create `src/init/generatedFiles.ts`:

```ts
import { GeneratedFile, InitializationSpec } from '../core/types.js'
import {
  claudeInstructions,
  codexInstructions,
  copilotInstructions,
  cursorGeneralRule,
  geminiInstructions,
  windsurfRules
} from '../templates/aiTools.js'
import { codingRuleFiles } from '../templates/codingRules.js'
import { documentationAgentFile, documentationFiles } from '../templates/docs.js'
import { hookScriptFiles } from '../templates/scripts.js'

function committed(path: string, content: string): GeneratedFile {
  return { path, content, commit: true }
}

export function buildGeneratedFiles(spec: InitializationSpec): GeneratedFile[] {
  const files: GeneratedFile[] = [
    committed('CLAUDE.md', claudeInstructions(spec)),
    committed('AGENTS.md', codexInstructions(spec)),
    committed('GEMINI.md', geminiInstructions(spec)),
    committed('.windsurfrules', windsurfRules(spec)),
    committed('.cursor/rules/general.mdc', cursorGeneralRule(spec)),
    committed('.github/copilot-instructions.md', copilotInstructions(spec))
  ]

  for (const [path, content] of codingRuleFiles(spec)) files.push(committed(path, content))
  for (const [path, content] of documentationFiles(spec)) files.push(committed(path, content))
  const [agentPath, agentContent] = documentationAgentFile()
  files.push(committed(agentPath, agentContent))
  for (const [path, content] of hookScriptFiles()) files.push(committed(path, content))

  return files
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm test -- tests/init/generatedFiles.test.ts
npm run typecheck
```

Expected: tests and typecheck pass.

- [ ] **Step 6: Commit**

```bash
git add src/init/generatedFiles.ts src/templates tests/init/generatedFiles.test.ts
git commit -m "feat: render governance files"
```

### Task 4: Local Runtime Config And State

**Files:**
- Create: `src/local/config.ts`
- Create: `src/local/gitignore.ts`
- Create: `src/local/state.ts`
- Create: `tests/local/config.test.ts`
- Create: `tests/local/state.test.ts`

**Interfaces:**
- Consumes: `LocalConfig`
- Produces: `defaultLocalConfig(): LocalConfig`
- Produces: `ensureLocalConfig(cwd: string): Promise<LocalConfig>`
- Produces: `ensureQuickInitIgnored(cwd: string): Promise<void>`
- Produces: `readActiveIteration(cwd: string): Promise<ActiveIterationState | null>`
- Produces: `writeActiveIteration(cwd: string, state: ActiveIterationState): Promise<void>`
- Produces: `clearActiveIteration(cwd: string): Promise<void>`

- [ ] **Step 1: Write failing local config tests**

Create `tests/local/config.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mkdtemp, readFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { ensureLocalConfig } from '../../src/local/config.js'
import { ensureQuickInitIgnored } from '../../src/local/gitignore.js'

async function tempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'quick-init-local-'))
}

describe('local config', () => {
  it('writes default .quick-init/config.json', async () => {
    const cwd = await tempDir()
    const config = await ensureLocalConfig(cwd)
    expect(config.archive.enabled).toBe(true)
    expect(config.archive.fallbackToManifestOnly).toBe(true)
    const raw = await readFile(path.join(cwd, '.quick-init/config.json'), 'utf8')
    expect(raw).toContain('"preCommitArchive": true')
  })

  it('adds .quick-init/ to gitignore without replacing existing content', async () => {
    const cwd = await tempDir()
    await ensureQuickInitIgnored(cwd)
    await ensureQuickInitIgnored(cwd)
    const raw = await readFile(path.join(cwd, '.gitignore'), 'utf8')
    expect(raw.match(/\\.quick-init\\//g)).toHaveLength(1)
  })
})
```

Create `tests/local/state.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mkdtemp } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { clearActiveIteration, readActiveIteration, writeActiveIteration } from '../../src/local/state.js'

async function tempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'quick-init-state-'))
}

describe('active iteration state', () => {
  it('round trips local active iteration state', async () => {
    const cwd = await tempDir()
    await writeActiveIteration(cwd, {
      iteration: '2026-06-26-支付流程设计',
      iterationPath: 'docs/iterations/2026-06-26-支付流程设计',
      updatedAt: '2026-06-26T10:00:00.000Z'
    })
    expect(await readActiveIteration(cwd)).toEqual({
      iteration: '2026-06-26-支付流程设计',
      iterationPath: 'docs/iterations/2026-06-26-支付流程设计',
      updatedAt: '2026-06-26T10:00:00.000Z'
    })
    await clearActiveIteration(cwd)
    expect(await readActiveIteration(cwd)).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/local/config.test.ts tests/local/state.test.ts
```

Expected: FAIL because local modules do not exist.

- [ ] **Step 3: Implement config and gitignore helpers**

Create `src/local/config.ts`:

```ts
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { LocalConfig } from '../core/types.js'

export function defaultLocalConfig(): LocalConfig {
  return {
    archive: {
      enabled: true,
      autoStage: true,
      aiSummary: true,
      model: 'cheap',
      timeoutMs: 30000,
      fallbackToManifestOnly: true
    },
    hooks: {
      preCommitArchive: true
    }
  }
}

export async function ensureLocalConfig(cwd: string): Promise<LocalConfig> {
  const dir = path.join(cwd, '.quick-init')
  const file = path.join(dir, 'config.json')
  await mkdir(dir, { recursive: true })
  try {
    return JSON.parse(await readFile(file, 'utf8')) as LocalConfig
  } catch {
    const config = defaultLocalConfig()
    await writeFile(file, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
    return config
  }
}
```

Create `src/local/gitignore.ts`:

```ts
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export async function ensureQuickInitIgnored(cwd: string): Promise<void> {
  const file = path.join(cwd, '.gitignore')
  let current = ''
  try {
    current = await readFile(file, 'utf8')
  } catch {
    current = ''
  }
  const lines = current.split(/\r?\n/).filter((line) => line.length > 0)
  if (!lines.includes('.quick-init/')) {
    lines.push('.quick-init/')
  }
  await writeFile(file, `${lines.join('\n')}\n`, 'utf8')
}
```

- [ ] **Step 4: Implement active state helpers**

Create `src/local/state.ts`:

```ts
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

export interface ActiveIterationState {
  iteration: string
  iterationPath: string
  updatedAt: string
}

function statePath(cwd: string): string {
  return path.join(cwd, '.quick-init/state/active-iteration.json')
}

export async function readActiveIteration(cwd: string): Promise<ActiveIterationState | null> {
  try {
    return JSON.parse(await readFile(statePath(cwd), 'utf8')) as ActiveIterationState
  } catch {
    return null
  }
}

export async function writeActiveIteration(cwd: string, state: ActiveIterationState): Promise<void> {
  await mkdir(path.dirname(statePath(cwd)), { recursive: true })
  await writeFile(statePath(cwd), `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

export async function clearActiveIteration(cwd: string): Promise<void> {
  await rm(statePath(cwd), { force: true })
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm test -- tests/local/config.test.ts tests/local/state.test.ts
npm run typecheck
```

Expected: tests and typecheck pass.

- [ ] **Step 6: Commit**

```bash
git add src/local tests/local
git commit -m "feat: manage local quick-init runtime state"
```

### Task 5: Git Operations, Hook Installation, And Scoped Commit

**Files:**
- Create: `src/git/git.ts`
- Create: `src/git/hooks.ts`
- Create: `src/git/scopedCommit.ts`
- Create: `tests/helpers/tempRepo.ts`
- Create: `tests/git/hooks.test.ts`
- Create: `tests/git/scopedCommit.test.ts`

**Interfaces:**
- Produces: `runGit(cwd: string, args: string[]): Promise<string>`
- Produces: `ensureGitRepository(cwd: string): Promise<{ initialized: boolean }>`
- Produces: `installPreCommitHook(cwd: string): Promise<void>`
- Produces: `scopedCommit(cwd: string, paths: string[], message: string): Promise<CommandResult>`

- [ ] **Step 1: Create Git test helper**

Create `tests/helpers/tempRepo.ts`:

```ts
import { mkdtemp, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export async function makeTempRepo(prefix = 'quick-init-repo-'): Promise<string> {
  const cwd = await mkdtemp(path.join(os.tmpdir(), prefix))
  await execFileAsync('git', ['init'], { cwd })
  await execFileAsync('git', ['config', 'user.name', 'Test User'], { cwd })
  await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd })
  return cwd
}

export async function writeRepoFile(cwd: string, relativePath: string, content: string): Promise<void> {
  const fullPath = path.join(cwd, relativePath)
  await import('node:fs/promises').then((fs) => fs.mkdir(path.dirname(fullPath), { recursive: true }))
  await writeFile(fullPath, content, 'utf8')
}
```

- [ ] **Step 2: Write hook installation tests**

Create `tests/git/hooks.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { installPreCommitHook } from '../../src/git/hooks.js'
import { makeTempRepo } from '../helpers/tempRepo.js'

describe('installPreCommitHook', () => {
  it('creates a pre-commit hook that calls quick-init archive --staged', async () => {
    const cwd = await makeTempRepo()
    await installPreCommitHook(cwd)
    const hook = await readFile(path.join(cwd, '.git/hooks/pre-commit'), 'utf8')
    expect(hook).toContain('# quick-init hook start')
    expect(hook).toContain('quick-init archive --staged')
    expect(hook).toContain('# quick-init hook end')
  })

  it('does not duplicate quick-init hook block', async () => {
    const cwd = await makeTempRepo()
    await installPreCommitHook(cwd)
    await installPreCommitHook(cwd)
    const hook = await readFile(path.join(cwd, '.git/hooks/pre-commit'), 'utf8')
    expect(hook.match(/quick-init archive --staged/g)).toHaveLength(1)
  })
})
```

Create `tests/git/scopedCommit.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { scopedCommit } from '../../src/git/scopedCommit.js'
import { makeTempRepo, writeRepoFile } from '../helpers/tempRepo.js'

const execFileAsync = promisify(execFile)

describe('scopedCommit', () => {
  it('commits only listed paths and leaves unrelated files untracked', async () => {
    const cwd = await makeTempRepo()
    await writeRepoFile(cwd, 'CLAUDE.md', '# Claude\n')
    await writeRepoFile(cwd, 'user-work.md', '# User Work\n')

    const result = await scopedCommit(cwd, ['CLAUDE.md'], 'docs: scoped commit')
    expect(result.ok).toBe(true)

    const { stdout } = await execFileAsync('git', ['status', '--short'], { cwd })
    expect(stdout).toContain('?? user-work.md')
    expect(stdout).not.toContain('CLAUDE.md')
  })
})
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
npm test -- tests/git/hooks.test.ts tests/git/scopedCommit.test.ts
```

Expected: FAIL because Git helpers do not exist.

- [ ] **Step 4: Implement Git helpers**

Create `src/git/git.ts`:

```ts
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export async function runGit(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd })
  return stdout
}

export async function ensureGitRepository(cwd: string): Promise<{ initialized: boolean }> {
  try {
    await runGit(cwd, ['rev-parse', '--is-inside-work-tree'])
    return { initialized: false }
  } catch {
    await runGit(cwd, ['init'])
    return { initialized: true }
  }
}
```

Create `src/git/hooks.ts`:

```ts
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const START = '# quick-init hook start'
const END = '# quick-init hook end'
const BLOCK = `${START}
quick-init archive --staged
${END}
`

export async function installPreCommitHook(cwd: string): Promise<void> {
  const hooksDir = path.join(cwd, '.git/hooks')
  const hookPath = path.join(hooksDir, 'pre-commit')
  await mkdir(hooksDir, { recursive: true })
  let current = ''
  try {
    current = await readFile(hookPath, 'utf8')
  } catch {
    current = '#!/usr/bin/env bash\nset -e\n'
  }
  if (!current.includes(START)) {
    const next = current.endsWith('\n') ? `${current}${BLOCK}` : `${current}\n${BLOCK}`
    await writeFile(hookPath, next, 'utf8')
  }
  await chmod(hookPath, 0o755)
}
```

Create `src/git/scopedCommit.ts`:

```ts
import { CommandResult } from '../core/types.js'
import { runGit } from './git.js'

export async function scopedCommit(cwd: string, paths: string[], message: string): Promise<CommandResult> {
  if (paths.length === 0) {
    return { ok: false, message: 'No paths provided for scoped commit' }
  }
  await runGit(cwd, ['add', '--', ...paths])
  await runGit(cwd, ['diff', '--cached', '--check'])
  await runGit(cwd, ['commit', '-m', message])
  return { ok: true, message, changedFiles: paths }
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm test -- tests/git/hooks.test.ts tests/git/scopedCommit.test.ts
npm run typecheck
```

Expected: tests and typecheck pass.

- [ ] **Step 6: Commit**

```bash
git add src/git tests/helpers/tempRepo.ts tests/git
git commit -m "feat: add git hook and scoped commit helpers"
```

### Task 6: Init Command Orchestration

**Files:**
- Create: `src/init/initCommand.ts`
- Create: `src/init/initialArchive.ts`
- Create: `tests/init/initCommand.test.ts`
- Modify: `src/cli.ts`

**Interfaces:**
- Consumes: `deriveInitializationSpec`, `buildGeneratedFiles`, `ensureLocalConfig`, `ensureQuickInitIgnored`, `ensureGitRepository`, `installPreCommitHook`, `scopedCommit`
- Produces: `runInitCommand(description: string, cwd: string): Promise<CommandResult>`

- [ ] **Step 1: Write init orchestration tests**

Create `tests/init/initCommand.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { runInitCommand } from '../../src/init/initCommand.js'
import { makeTempRepo, writeRepoFile } from '../helpers/tempRepo.js'

const execFileAsync = promisify(execFile)

describe('runInitCommand', () => {
  it('generates governance files, local config, hook, and initial commit', async () => {
    const cwd = await makeTempRepo()
    const result = await runInitCommand('TypeScript CLI 工具', cwd)
    expect(result.ok).toBe(true)

    await access(path.join(cwd, 'CLAUDE.md'))
    await access(path.join(cwd, 'agents/documentation.md'))
    await access(path.join(cwd, '.quick-init/config.json'))
    await access(path.join(cwd, 'docs/iterations'))
    const gitignore = await readFile(path.join(cwd, '.gitignore'), 'utf8')
    expect(gitignore).toContain('.quick-init/')
    const hook = await readFile(path.join(cwd, '.git/hooks/pre-commit'), 'utf8')
    expect(hook).toContain('quick-init archive --staged')
    const { stdout } = await execFileAsync('git', ['log', '--oneline', '-1'], { cwd })
    expect(stdout).toContain('chore: initialize quick-init governance')
  })

  it('does not commit unrelated dirty files', async () => {
    const cwd = await makeTempRepo()
    await writeRepoFile(cwd, 'user-note.md', '# User note\n')
    await runInitCommand('TypeScript CLI 工具', cwd)
    const { stdout } = await execFileAsync('git', ['status', '--short'], { cwd })
    expect(stdout).toContain('?? user-note.md')
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/init/initCommand.test.ts
```

Expected: FAIL because `runInitCommand` does not exist.

- [ ] **Step 3: Implement initialization archive generator**

Create `src/init/initialArchive.ts`:

```ts
import { createHash } from 'node:crypto'
import { GeneratedFile } from '../core/types.js'

export function buildInitialArchiveFiles(generatedFiles: GeneratedFile[], gitInitialized: boolean, hookInstalled: boolean, now = new Date()): GeneratedFile[] {
  const iteration = `${now.toISOString().slice(0, 10)}-初始化工程治理`
  const generatedPaths = generatedFiles.filter((file) => file.commit).map((file) => file.path).sort()
  const manifest = {
    iteration,
    type: 'initialization',
    summaryStatus: 'generated',
    generatedFiles: generatedPaths,
    localFiles: ['.quick-init/config.json', '.git/hooks/pre-commit'],
    hookInstalled,
    gitInitialized,
    sha256: createHash('sha256').update(generatedPaths.join('\n')).digest('hex')
  }
  const iterationMd = `# 初始化工程治理

## Summary

quick-init 初始化了本项目的 AI coding 工程治理体系。

## Generated Files

${generatedPaths.map((item) => `- ${item}`).join('\n')}

## Local Files

- .quick-init/config.json
- .git/hooks/pre-commit

## Notes

Local files are not committed and are used only by quick-init runtime.
`

  return [
    {
      path: `docs/iterations/${iteration}/iteration.md`,
      content: iterationMd,
      commit: true
    },
    {
      path: `docs/iterations/${iteration}/manifest.json`,
      content: `${JSON.stringify(manifest, null, 2)}\n`,
      commit: true
    }
  ]
}
```

- [ ] **Step 4: Implement init command**

Create `src/init/initCommand.ts`:

```ts
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { CommandResult, GeneratedFile } from '../core/types.js'
import { ensureGitRepository } from '../git/git.js'
import { installPreCommitHook } from '../git/hooks.js'
import { scopedCommit } from '../git/scopedCommit.js'
import { ensureLocalConfig } from '../local/config.js'
import { ensureQuickInitIgnored } from '../local/gitignore.js'
import { deriveInitializationSpec } from './deriveSpec.js'
import { buildGeneratedFiles } from './generatedFiles.js'
import { buildInitialArchiveFiles } from './initialArchive.js'

async function writeGeneratedFile(cwd: string, file: GeneratedFile): Promise<void> {
  const fullPath = path.join(cwd, file.path)
  await mkdir(path.dirname(fullPath), { recursive: true })
  await writeFile(fullPath, file.content, 'utf8')
}

export async function runInitCommand(description: string, cwd: string): Promise<CommandResult> {
  const gitState = await ensureGitRepository(cwd)
  const spec = deriveInitializationSpec(description, cwd)
  const generatedFiles = buildGeneratedFiles(spec)
  for (const file of generatedFiles) {
    await writeGeneratedFile(cwd, file)
  }
  await ensureLocalConfig(cwd)
  await ensureQuickInitIgnored(cwd)
  await installPreCommitHook(cwd)

  const archiveFiles = buildInitialArchiveFiles(generatedFiles, gitState.initialized, true)
  for (const file of archiveFiles) {
    await writeGeneratedFile(cwd, file)
  }

  const commitPaths = [
    ...generatedFiles.filter((file) => file.commit).map((file) => file.path),
    ...archiveFiles.map((file) => file.path),
    '.gitignore'
  ]
  return scopedCommit(cwd, commitPaths, 'chore: initialize quick-init governance')
}
```

- [ ] **Step 5: Wire CLI init command**

Modify `src/cli.ts` so the `init` branch calls `runInitCommand`:

```ts
import { runInitCommand } from './init/initCommand.js'

export async function runCli(argv: string[], cwd: string = process.cwd()): Promise<CommandResult> {
  const [command, ...rest] = argv
  if (!command) {
    return { ok: false, message: usage() }
  }
  if (command === 'init') {
    const description = rest.join(' ').trim()
    if (!description) {
      return { ok: false, message: 'init requires a business description' }
    }
    return runInitCommand(description, cwd)
  }
  if (!['archive', 'iteration'].includes(command)) {
    return { ok: false, message: `Unknown command: ${command}` }
  }
  return { ok: false, message: `Command not wired yet: ${command} in ${cwd}` }
}
```

Keep the existing shebang and `usage()` function.

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -- tests/init/initCommand.test.ts tests/cli.test.ts
npm run typecheck
```

Expected: tests and typecheck pass.

- [ ] **Step 7: Commit**

```bash
git add src/init src/cli.ts tests/init/initCommand.test.ts
git commit -m "feat: initialize governance workspace"
```

### Task 7: Markdown Classification And Slug Generation

**Files:**
- Create: `src/archive/markdown.ts`
- Create: `src/archive/classifier.ts`
- Create: `src/archive/slug.ts`
- Create: `tests/archive/classifier.test.ts`
- Create: `tests/archive/slug.test.ts`

**Interfaces:**
- Produces: `extractMarkdownTitle(content: string): string | null`
- Produces: `toIterationSlug(title: string): string`
- Produces: `classifyMarkdown(path: string, content: string): ArchiveDocument`

- [ ] **Step 1: Write failing classifier and slug tests**

Create `tests/archive/slug.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { toIterationSlug } from '../../src/archive/slug.js'

describe('toIterationSlug', () => {
  it('keeps Chinese characters and normalizes punctuation', () => {
    expect(toIterationSlug('支付流程设计：V1 方案')).toBe('支付流程设计-v1-方案')
  })

  it('falls back when title has no usable characters', () => {
    expect(toIterationSlug('---')).toBe('iteration')
  })
})
```

Create `tests/archive/classifier.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/archive/slug.test.ts tests/archive/classifier.test.ts
```

Expected: FAIL because archive modules do not exist.

- [ ] **Step 3: Implement Markdown helpers and slugging**

Create `src/archive/markdown.ts`:

```ts
export function extractMarkdownTitle(content: string): string | null {
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^#\s+(.+?)\s*$/)
    if (match) return match[1].trim()
  }
  return null
}
```

Create `src/archive/slug.ts`:

```ts
export function toIterationSlug(title: string): string {
  const normalized = title
    .trim()
    .toLowerCase()
    .replace(/[\\/:：()（）\\[\\]{}，,.;；!！?？"'`~@#$%^&*=+|<>]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
    .replace(/-$/g, '')
  return normalized.length > 0 ? normalized : 'iteration'
}
```

- [ ] **Step 4: Implement classifier**

Create `src/archive/classifier.ts`:

```ts
import { createHash } from 'node:crypto'
import { ArchiveDocument, ArchiveCategory } from '../core/types.js'
import { extractMarkdownTitle } from './markdown.js'

export { extractMarkdownTitle }

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

function categoryForPath(path: string): ArchiveCategory {
  if (path.startsWith('docs/specs/')) return 'specs'
  if (path.startsWith('docs/designs/')) return 'designs'
  if (path.startsWith('docs/verification/')) return 'verification'
  if (path.startsWith('docs/decisions/')) return 'decisions'
  if (path.startsWith('docs/research/')) return 'research'
  if (path.startsWith('.coding-rules/')) return 'rules'
  if (['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', '.windsurfrules'].includes(path)) return 'tooling'
  if (['README.md', 'docs/architecture.md', 'docs/tech-stack.md', 'docs/changelog.md'].includes(path)) return 'project'
  return 'unknown'
}

export function classifyMarkdown(path: string, content: string): ArchiveDocument {
  if (path.endsWith('/_README.md') || path === '_README.md') {
    return { sourcePath: path, archivePath: null, category: categoryForPath(path), action: 'skip', reason: 'workspace readme file', sha256: sha256(content) }
  }
  const category = categoryForPath(path)
  if (['specs', 'designs', 'verification', 'decisions', 'research'].includes(category)) {
    return { sourcePath: path, archivePath: null, category, action: 'archive', reason: `path matched ${category}`, sha256: sha256(content) }
  }
  if (['rules', 'tooling', 'project'].includes(category)) {
    return { sourcePath: path, archivePath: null, category, action: 'summarize-only', reason: 'long-lived project document', sha256: sha256(content) }
  }
  return { sourcePath: path, archivePath: null, category, action: 'summarize-only', reason: 'uncertain markdown classification', sha256: sha256(content) }
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm test -- tests/archive/slug.test.ts tests/archive/classifier.test.ts
npm run typecheck
```

Expected: tests and typecheck pass.

- [ ] **Step 6: Commit**

```bash
git add src/archive/markdown.ts src/archive/slug.ts src/archive/classifier.ts tests/archive
git commit -m "feat: classify markdown archives"
```

### Task 8: Manifest And Iteration Text Generation

**Files:**
- Create: `src/archive/manifest.ts`
- Create: `src/archive/iterationText.ts`
- Create: `src/archive/activeIteration.ts`
- Create: `tests/archive/archiveCommand.test.ts`

**Interfaces:**
- Produces: `buildManifest(params): ArchiveManifest`
- Produces: `renderIterationMarkdown(manifest: ArchiveManifest): string`
- Produces: `resolveIterationTarget(cwd: string, docs: ArchiveDocument[]): Promise<IterationTarget>`

- [ ] **Step 1: Write failing manifest tests**

Append to `tests/archive/archiveCommand.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildManifest } from '../../src/archive/manifest.js'
import { renderIterationMarkdown } from '../../src/archive/iterationText.js'

describe('manifest and iteration text', () => {
  it('builds an active manifest with degraded summary support', () => {
    const manifest = buildManifest({
      iteration: '2026-06-26-支付流程设计',
      summaryStatus: 'degraded',
      slugSource: { type: 'markdown-title', path: 'docs/designs/payment.md', title: '支付流程设计' },
      documents: [
        {
          sourcePath: 'docs/designs/payment.md',
          archivePath: 'docs/iterations/2026-06-26-支付流程设计/designs/payment.md',
          category: 'designs',
          action: 'archive',
          reason: 'path matched designs',
          sha256: 'abc'
        }
      ],
      runId: '2026-06-26T10-00-00'
    })

    expect(manifest.status).toBe('active')
    expect(manifest.archiveRuns[0].documents[0].action).toBe('archive')
    expect(renderIterationMarkdown(manifest)).toContain('summary_status: degraded')
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/archive/archiveCommand.test.ts
```

Expected: FAIL because manifest functions do not exist.

- [ ] **Step 3: Implement manifest builder**

Create `src/archive/manifest.ts`:

```ts
import { ArchiveDocument, ArchiveManifest, SummaryStatus } from '../core/types.js'

export interface BuildManifestInput {
  iteration: string
  summaryStatus: SummaryStatus
  slugSource: ArchiveManifest['slugSource']
  documents: ArchiveDocument[]
  runId: string
}

export function buildManifest(input: BuildManifestInput): ArchiveManifest {
  return {
    iteration: input.iteration,
    status: 'active',
    summaryStatus: input.summaryStatus,
    slugSource: input.slugSource,
    archiveRuns: [
      {
        runId: input.runId,
        commit: 'pending',
        documents: input.documents
      }
    ]
  }
}
```

Create `src/archive/iterationText.ts`:

```ts
import { ArchiveManifest } from '../core/types.js'

export function renderIterationMarkdown(manifest: ArchiveManifest): string {
  const documents = manifest.archiveRuns.flatMap((run) => run.documents)
  return `# ${manifest.iteration}

## Summary Status

summary_status: ${manifest.summaryStatus}

## Archived Documents

${documents.map((doc) => `- ${doc.action}: ${doc.sourcePath}${doc.archivePath ? ` -> ${doc.archivePath}` : ''}`).join('\n') || '- none'}

## Verification

not summarized

## Risks

not summarized
`
}
```

- [ ] **Step 4: Implement active iteration resolver**

Create `src/archive/activeIteration.ts`:

```ts
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { ArchiveDocument, ArchiveManifest } from '../core/types.js'
import { readActiveIteration } from '../local/state.js'
import { extractMarkdownTitle } from './markdown.js'
import { toIterationSlug } from './slug.js'

export interface IterationTarget {
  iteration: string
  iterationPath: string
  slugSource: ArchiveManifest['slugSource']
}

async function activeManifests(cwd: string): Promise<ArchiveManifest[]> {
  const root = path.join(cwd, 'docs/iterations')
  try {
    const entries = await readdir(root, { withFileTypes: true })
    const manifests: ArchiveManifest[] = []
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const raw = await readFile(path.join(root, entry.name, 'manifest.json'), 'utf8')
      const manifest = JSON.parse(raw) as ArchiveManifest
      if (manifest.status === 'active') manifests.push(manifest)
    }
    return manifests
  } catch {
    return []
  }
}

export async function resolveIterationTarget(cwd: string, docs: ArchiveDocument[], markdownContentByPath: Map<string, string>): Promise<IterationTarget> {
  const local = await readActiveIteration(cwd)
  if (local) {
    return { iteration: local.iteration, iterationPath: local.iterationPath, slugSource: { type: 'fallback', title: local.iteration } }
  }
  const manifests = await activeManifests(cwd)
  const firstArchiveDoc = docs.find((doc) => doc.action === 'archive') ?? docs[0]
  const content = firstArchiveDoc ? markdownContentByPath.get(firstArchiveDoc.sourcePath) ?? '' : ''
  const title = extractMarkdownTitle(content) ?? firstArchiveDoc?.sourcePath.split('/').pop()?.replace(/\.md$/, '') ?? 'iteration'
  const slug = toIterationSlug(title)
  const matched = manifests.find((manifest) => manifest.iteration.endsWith(slug))
  if (matched) {
    return { iteration: matched.iteration, iterationPath: `docs/iterations/${matched.iteration}`, slugSource: matched.slugSource }
  }
  const iteration = `${new Date().toISOString().slice(0, 10)}-${slug}`
  return {
    iteration,
    iterationPath: `docs/iterations/${iteration}`,
    slugSource: { type: 'markdown-title', path: firstArchiveDoc?.sourcePath, title }
  }
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm test -- tests/archive/archiveCommand.test.ts
npm run typecheck
```

Expected: tests and typecheck pass.

- [ ] **Step 6: Commit**

```bash
git add src/archive/manifest.ts src/archive/iterationText.ts src/archive/activeIteration.ts tests/archive/archiveCommand.test.ts
git commit -m "feat: build archive manifests"
```

### Task 9: Archive Command And AI Summary Fallback

**Files:**
- Create: `src/archive/archiveCommand.ts`
- Create: `src/ai/summary.ts`
- Modify: `src/cli.ts`
- Modify: `tests/archive/archiveCommand.test.ts`

**Interfaces:**
- Consumes: `classifyMarkdown`, `resolveIterationTarget`, `buildManifest`, `renderIterationMarkdown`, `ensureLocalConfig`
- Produces: `runArchiveCommand(cwd: string, options: { staged: boolean }): Promise<CommandResult>`
- Produces: `summarizeArchive(input): Promise<{ status: 'ok' | 'degraded'; markdown?: string }>`

- [ ] **Step 1: Add failing archive command tests**

Append to `tests/archive/archiveCommand.test.ts`:

```ts
import { readFile, access } from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { runArchiveCommand } from '../../src/archive/archiveCommand.js'
import { makeTempRepo, writeRepoFile } from '../helpers/tempRepo.js'

const execFileAsync = promisify(execFile)

describe('runArchiveCommand', () => {
  it('does nothing when there are no staged markdown files', async () => {
    const cwd = await makeTempRepo()
    await writeRepoFile(cwd, 'src/index.ts', 'export const value = 1\n')
    await execFileAsync('git', ['add', 'src/index.ts'], { cwd })
    const result = await runArchiveCommand(cwd, { staged: true })
    expect(result.ok).toBe(true)
    expect(result.message).toContain('No staged Markdown files')
  })

  it('moves archiveable staged markdown into docs/iterations and stages the result', async () => {
    const cwd = await makeTempRepo()
    await writeRepoFile(cwd, 'docs/designs/payment.md', '# 支付流程设计\n\n设计内容\n')
    await execFileAsync('git', ['add', 'docs/designs/payment.md'], { cwd })

    const result = await runArchiveCommand(cwd, { staged: true })
    expect(result.ok).toBe(true)

    const today = new Date().toISOString().slice(0, 10)
    const iteration = `${today}-支付流程设计`
    const archivePath = `docs/iterations/${iteration}/designs/payment.md`
    await access(path.join(cwd, archivePath))
    const manifest = await readFile(path.join(cwd, `docs/iterations/${iteration}/manifest.json`), 'utf8')
    expect(manifest).toContain('"action": "archive"')
    const { stdout } = await execFileAsync('git', ['diff', '--cached', '--name-only'], { cwd })
    expect(stdout).toContain(archivePath)
    expect(stdout).toContain(`docs/iterations/${iteration}/manifest.json`)
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/archive/archiveCommand.test.ts
```

Expected: FAIL because `runArchiveCommand` does not exist.

- [ ] **Step 3: Implement AI summary boundary**

Create `src/ai/summary.ts`:

```ts
import { ArchiveManifest } from '../core/types.js'

export interface SummaryResult {
  status: 'ok' | 'degraded'
  markdown?: string
  reason?: string
}

export async function summarizeArchive(manifest: ArchiveManifest): Promise<SummaryResult> {
  return {
    status: 'degraded',
    reason: `AI summary unavailable for ${manifest.iteration}`
  }
}
```

- [ ] **Step 4: Implement archive command**

Create `src/archive/archiveCommand.ts`:

```ts
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { CommandResult } from '../core/types.js'
import { runGit } from '../git/git.js'
import { ensureLocalConfig } from '../local/config.js'
import { writeActiveIteration } from '../local/state.js'
import { summarizeArchive } from '../ai/summary.js'
import { resolveIterationTarget } from './activeIteration.js'
import { classifyMarkdown } from './classifier.js'
import { buildManifest } from './manifest.js'
import { renderIterationMarkdown } from './iterationText.js'

async function stagedMarkdownFiles(cwd: string): Promise<string[]> {
  const output = await runGit(cwd, ['diff', '--cached', '--name-only', '--diff-filter=ACM'])
  return output.split(/\r?\n/).filter((item) => item.endsWith('.md'))
}

function archivePathFor(iterationPath: string, sourcePath: string, category: string): string {
  return `${iterationPath}/${category}/${path.basename(sourcePath)}`
}

export async function runArchiveCommand(cwd: string, options: { staged: boolean }): Promise<CommandResult> {
  if (!options.staged) {
    return { ok: false, message: 'archive currently requires --staged' }
  }
  const config = await ensureLocalConfig(cwd)
  if (!config.archive.enabled) {
    return { ok: true, message: 'Archive disabled by .quick-init/config.json' }
  }
  const staged = await stagedMarkdownFiles(cwd)
  if (staged.length === 0) {
    return { ok: true, message: 'No staged Markdown files to archive' }
  }

  const contentByPath = new Map<string, string>()
  const docs = []
  for (const relativePath of staged) {
    const content = await readFile(path.join(cwd, relativePath), 'utf8')
    contentByPath.set(relativePath, content)
    docs.push(classifyMarkdown(relativePath, content))
  }

  const target = await resolveIterationTarget(cwd, docs, contentByPath)
  const movedDocs = []
  for (const doc of docs) {
    if (doc.action === 'archive') {
      const archivePath = archivePathFor(target.iterationPath, doc.sourcePath, doc.category)
      await mkdir(path.dirname(path.join(cwd, archivePath)), { recursive: true })
      await rename(path.join(cwd, doc.sourcePath), path.join(cwd, archivePath))
      movedDocs.push({ ...doc, archivePath })
    } else {
      movedDocs.push(doc)
    }
  }

  const runId = new Date().toISOString().replace(/[:.]/g, '-')
  const manifest = buildManifest({
    iteration: target.iteration,
    summaryStatus: 'degraded',
    slugSource: target.slugSource,
    documents: movedDocs,
    runId
  })
  const summary = await summarizeArchive(manifest)
  manifest.summaryStatus = summary.status
  await mkdir(path.join(cwd, target.iterationPath), { recursive: true })
  await writeFile(path.join(cwd, target.iterationPath, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  await writeFile(path.join(cwd, target.iterationPath, 'iteration.md'), summary.markdown ?? renderIterationMarkdown(manifest), 'utf8')
  await writeActiveIteration(cwd, {
    iteration: target.iteration,
    iterationPath: target.iterationPath,
    updatedAt: new Date().toISOString()
  })

  if (config.archive.autoStage) {
    await runGit(cwd, ['add', '--', target.iterationPath])
    const movedSources = movedDocs.filter((doc) => doc.action === 'archive').map((doc) => doc.sourcePath)
    if (movedSources.length > 0) {
      await runGit(cwd, ['add', '-u', '--', ...movedSources])
    }
  }

  return { ok: true, message: `Archived Markdown into ${target.iterationPath}`, changedFiles: movedDocs.map((doc) => doc.archivePath ?? doc.sourcePath) }
}
```

- [ ] **Step 5: Wire CLI archive command**

Modify `src/cli.ts`:

```ts
import { runArchiveCommand } from './archive/archiveCommand.js'

if (command === 'archive') {
  if (!rest.includes('--staged')) {
    return { ok: false, message: 'archive requires --staged' }
  }
  return runArchiveCommand(cwd, { staged: true })
}
```

Keep existing `init` behavior.

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -- tests/archive/archiveCommand.test.ts tests/cli.test.ts
npm run typecheck
```

Expected: tests and typecheck pass.

- [ ] **Step 7: Commit**

```bash
git add src/archive src/ai src/cli.ts tests/archive/archiveCommand.test.ts
git commit -m "feat: archive staged markdown"
```

### Task 10: Iteration Commands And Skill Packaging

**Files:**
- Create: `src/iteration/commands.ts`
- Create: `tests/iteration/commands.test.ts`
- Create: `SKILL.md`
- Modify: `src/cli.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `readActiveIteration`, `writeActiveIteration`, `clearActiveIteration`
- Produces: `runIterationCommand(args: string[], cwd: string): Promise<CommandResult>`

- [ ] **Step 1: Write iteration command tests**

Create `tests/iteration/commands.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mkdtemp } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { runIterationCommand } from '../../src/iteration/commands.js'

async function tempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'quick-init-iteration-'))
}

describe('runIterationCommand', () => {
  it('starts, reports, and closes a local active iteration', async () => {
    const cwd = await tempDir()
    const started = await runIterationCommand(['start', '支付流程设计'], cwd)
    expect(started.ok).toBe(true)
    const status = await runIterationCommand(['status'], cwd)
    expect(status.message).toContain('支付流程设计')
    const closed = await runIterationCommand(['close'], cwd)
    expect(closed.ok).toBe(true)
    const empty = await runIterationCommand(['status'], cwd)
    expect(empty.message).toContain('No active iteration')
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/iteration/commands.test.ts
```

Expected: FAIL because iteration command module does not exist.

- [ ] **Step 3: Implement iteration commands**

Create `src/iteration/commands.ts`:

```ts
import { CommandResult } from '../core/types.js'
import { clearActiveIteration, readActiveIteration, writeActiveIteration } from '../local/state.js'
import { toIterationSlug } from '../archive/slug.js'

export async function runIterationCommand(args: string[], cwd: string): Promise<CommandResult> {
  const [subcommand, ...rest] = args
  if (subcommand === 'status') {
    const state = await readActiveIteration(cwd)
    return state
      ? { ok: true, message: `Active iteration: ${state.iteration}` }
      : { ok: true, message: 'No active iteration' }
  }
  if (subcommand === 'start') {
    const name = rest.join(' ').trim()
    if (!name) return { ok: false, message: 'iteration start requires a name' }
    const iteration = `${new Date().toISOString().slice(0, 10)}-${toIterationSlug(name)}`
    await writeActiveIteration(cwd, {
      iteration,
      iterationPath: `docs/iterations/${iteration}`,
      updatedAt: new Date().toISOString()
    })
    return { ok: true, message: `Started iteration: ${iteration}` }
  }
  if (subcommand === 'close') {
    await clearActiveIteration(cwd)
    return { ok: true, message: 'Closed active iteration' }
  }
  return { ok: false, message: 'Usage: quick-init iteration <status|start|close>' }
}
```

- [ ] **Step 4: Wire CLI iteration command**

Modify `src/cli.ts`:

```ts
import { runIterationCommand } from './iteration/commands.js'

if (command === 'iteration') {
  return runIterationCommand(rest, cwd)
}
```

Keep existing `init` and `archive` branches.

- [ ] **Step 5: Create Claude Code Skill entrypoint**

Create `SKILL.md`:

```md
---
name: quick-init
description: Initialize a full vibecoding governance layer from a natural-language project description, including AI coding instructions, shared rules, docs, local archive state, Git hooks, and scoped initialization commit.
---

# quick-init

Use this skill when the user wants to initialize a new vibecoding or AI coding project governance structure.

## Usage

Run:

```bash
quick-init init "<业务描述>"
```

The initializer:

- derives a full-governance InitializationSpec,
- generates AI tool entry files and .coding-rules/,
- creates agents/documentation.md as the only default subagent,
- writes local .quick-init/config.json and ignores .quick-init/,
- installs a pre-commit hook that calls quick-init archive --staged,
- creates docs/iterations/YYYY-MM-DD-初始化工程治理/,
- commits only quick-init-generated files.

## Archive

Run:

```bash
quick-init archive --staged
```

This command classifies staged Markdown, moves archiveable docs to docs/iterations/, writes manifest.json and iteration.md, and stages the archive result. If AI summary is unavailable, it creates a degraded manifest-only archive.
```

- [ ] **Step 6: Run tests and build**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all tests pass, typecheck exits 0, and `dist/cli.js` exists.

- [ ] **Step 7: Commit**

```bash
git add src/iteration src/cli.ts tests/iteration SKILL.md package.json
git commit -m "feat: add iteration commands and skill entrypoint"
```

### Task 11: End-To-End Verification And Documentation Hardening

**Files:**
- Create: `tests/e2e.test.ts`
- Modify: `docs/superpowers/specs/2026-06-26-quick-init-governance-design.md` only if implementation discovers a confirmed spec correction

**Interfaces:**
- Consumes: all CLI commands
- Produces: verified end-to-end behavior in a temporary real Git repository

- [ ] **Step 1: Write end-to-end test**

Create `tests/e2e.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { runCli } from '../src/cli.js'
import { makeTempRepo, writeRepoFile } from './helpers/tempRepo.js'

const execFileAsync = promisify(execFile)

describe('quick-init e2e', () => {
  it('initializes governance and archives staged markdown on commit path', async () => {
    const cwd = await makeTempRepo()
    const init = await runCli(['init', 'TypeScript CLI 工具'], cwd)
    expect(init.ok).toBe(true)

    await writeRepoFile(cwd, 'docs/designs/payment.md', '# 支付流程设计\n\n设计内容\n')
    await execFileAsync('git', ['add', 'docs/designs/payment.md'], { cwd })
    const archive = await runCli(['archive', '--staged'], cwd)
    expect(archive.ok).toBe(true)

    const today = new Date().toISOString().slice(0, 10)
    const iterationDir = path.join(cwd, `docs/iterations/${today}-支付流程设计`)
    await access(path.join(iterationDir, 'designs/payment.md'))
    const manifest = await readFile(path.join(iterationDir, 'manifest.json'), 'utf8')
    expect(manifest).toContain('"summaryStatus": "degraded"')
    const status = await execFileAsync('git', ['diff', '--cached', '--name-only'], { cwd })
    expect(status.stdout).toContain(`docs/iterations/${today}-支付流程设计/designs/payment.md`)
  })
})
```

- [ ] **Step 2: Run full verification**

Run:

```bash
npm test
npm run typecheck
npm run build
git status --short --branch
```

Expected:

```text
All Vitest tests pass.
Typecheck exits 0.
Build exits 0.
git status shows only intended files modified or untracked for the current task.
```

- [ ] **Step 3: Check generated package binary manually**

Run:

```bash
node dist/cli.js
node dist/cli.js iteration status
```

Expected:

```text
The first command prints Usage: quick-init and exits 1.
The second command prints No active iteration and exits 0.
```

- [ ] **Step 4: Commit**

```bash
git add tests/e2e.test.ts
git commit -m "test: verify quick-init governance flow"
```

## Plan Self-Review

Spec coverage:

- Natural language to full `InitializationSpec`: Task 2.
- Mainstream AI tool entry files and `.coding-rules/**`: Task 3.
- Only `agents/documentation.md` as default subagent: Task 3.
- Local `.quick-init/**` config and state ignored from Git: Task 4.
- Git init, hook installation, and scoped commit: Tasks 5 and 6.
- Initial governance archive: Task 6.
- Markdown auto-classification and conservative summarize-only fallback: Task 7.
- Chinese slug generation: Task 7.
- Cross-commit active iteration state and manifest facts: Task 8.
- AI summary degraded fallback: Task 9.
- No staged Markdown means no archive blocking: Task 9.
- Iteration status/start/close commands: Task 10.
- End-to-end verification: Task 11.

Review scan:

- This plan intentionally avoids unresolved-marker language and open-ended implementation markers.
- Each task names exact files, exported interfaces, commands, and expected outcomes.

Type consistency:

- `InitializationSpec`, `GeneratedFile`, `LocalConfig`, `ArchiveManifest`, `ArchiveDocument`, and `CommandResult` are defined in Task 1 and consumed unchanged by later tasks.
- `runCli`, `runInitCommand`, `runArchiveCommand`, and `runIterationCommand` use `Promise<CommandResult>` consistently.
- `ArchiveDocument.action` values are exactly `archive`, `keep`, `summarize-only`, and `skip`.
