import { describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

import { buildManifest } from '../../src/archive/manifest.js'
import { resolveIterationTarget } from '../../src/archive/activeIteration.js'
import { renderIterationMarkdown } from '../../src/archive/iterationText.js'
import { toIterationSlug } from '../../src/archive/slug.js'

import type { ArchiveDocument } from '../../src/core/types.js'

async function tempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'quick-init-task8-'))
}

function sampleArchiveDocs(contentPath = 'docs/specs/payment.md'): ArchiveDocument[] {
  return [
    {
      sourcePath: contentPath,
      archivePath: null,
      category: 'specs',
      action: 'archive',
      reason: 'classified for archive',
      sha256: 'a'.repeat(64)
    }
  ]
}

describe('manifest and iteration markdown', () => {
  it('builds an active manifest and renders iteration markdown', () => {
    const manifest = buildManifest({
      iteration: '2026-06-26-支付流程设计',
      summaryStatus: 'degraded',
      slugSource: {
        type: 'markdown-title',
        path: 'docs/specs/payment.md',
        title: '支付流程设计'
      },
      documents: sampleArchiveDocs(),
      runId: '2026-06-26T10-00-00'
    })

    expect(manifest.status).toBe('active')
    expect(manifest.archiveRuns[0].commit).toBe('pending')
    expect(manifest.archiveRuns[0].documents[0].action).toBe('archive')

    const markdown = renderIterationMarkdown(manifest)
    expect(markdown).toContain('# 2026-06-26-支付流程设计')
    expect(markdown).toContain('summary_status: degraded')
    expect(markdown).toContain('- archive: docs/specs/payment.md')
    expect(markdown).toContain('## Verification')
    expect(markdown).toContain('not summarized')
    expect(markdown).toContain('## Risks')
  })
})

describe('resolveIterationTarget', () => {
  it('uses local active iteration file when valid', async () => {
    const cwd = await tempDir()
    const localActivePath = path.join(cwd, '.quick-init', 'active-iteration.json')
    await mkdir(path.dirname(localActivePath), { recursive: true })
    await writeFile(
      localActivePath,
      JSON.stringify(
        {
          iteration: '2026-06-27-local',
          iterationPath: 'docs/iterations/2026-06-27-local',
          updatedAt: '2026-06-27T10:00:00.000Z'
        },
        null,
        2
      ),
      'utf8'
    )

    const docs = sampleArchiveDocs()
    const markdownByPath = new Map([['docs/specs/payment.md', '# 支付流程设计\n...']])
    const target = await resolveIterationTarget(cwd, docs, markdownByPath)

    expect(target).toEqual({
      iteration: '2026-06-27-local',
      iterationPath: 'docs/iterations/2026-06-27-local',
      slugSource: {
        type: 'fallback',
        title: '2026-06-27-local'
      }
    })
  })

  it('reuses an existing active manifest when iteration suffix matches slug', async () => {
    const cwd = await tempDir()
    const docs: ArchiveDocument[] = sampleArchiveDocs()
    const iteration = '2026-06-26-支付流程设计'
    const manifestPath = path.join(cwd, 'docs', 'iterations', iteration, 'manifest.json')
    await mkdir(path.dirname(manifestPath), { recursive: true })
    await writeFile(
      manifestPath,
      JSON.stringify(
        {
          iteration,
          status: 'active',
          summaryStatus: 'generated',
          slugSource: {
            type: 'markdown-title',
            path: 'docs/specs/old-spec.md',
            title: '支付流程设计'
          },
          archiveRuns: [
            {
              runId: 'seed',
              commit: 'pending',
              documents: sampleArchiveDocs('docs/specs/old-spec.md')
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    )

    const markdownByPath = new Map([['docs/specs/payment.md', '# 支付流程设计\n详细内容']])
    const target = await resolveIterationTarget(cwd, docs, markdownByPath)

    expect(target.iteration).toBe(iteration)
    expect(target.iterationPath).toBe(`docs/iterations/${iteration}`)
    expect(target.slugSource).toEqual({
      type: 'markdown-title',
      path: 'docs/specs/old-spec.md',
      title: '支付流程设计'
    })
  })

  it('creates a new iteration with Chinese slug when no local or active match', async () => {
    const cwd = await tempDir()
    const docs = sampleArchiveDocs('docs/specs/支付幂等性.md')
    const markdownByPath = new Map([
      ['docs/specs/支付幂等性.md', '# 支付幂等性回归测试\n详细内容']
    ])

    const target = await resolveIterationTarget(cwd, docs, markdownByPath)

    const expectedSlug = toIterationSlug('支付幂等性回归测试')
    expect(target.iteration).toContain(`${new Date().toISOString().slice(0, 10)}-${expectedSlug}`)
    expect(target.iterationPath).toBe(`docs/iterations/${target.iteration}`)
    expect(target.slugSource).toEqual({
      type: 'markdown-title',
      path: 'docs/specs/支付幂等性.md',
      title: '支付幂等性回归测试'
    })
  })
})
