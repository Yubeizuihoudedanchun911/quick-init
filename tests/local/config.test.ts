import { describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
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

  it('preserves .gitignore comments and blank lines while adding .quick-init/', async () => {
    const cwd = await tempDir()
    const gitignorePath = path.join(cwd, '.gitignore')
    const original = '# keep this comment\n\nbuild/\n\n# cache\n.cache\n'
    await writeFile(gitignorePath, original, 'utf8')
    await ensureQuickInitIgnored(cwd)
    await ensureQuickInitIgnored(cwd)
    const raw = await readFile(gitignorePath, 'utf8')
    expect(raw).toBe(`${original}.quick-init/\n`)
  })

  it('keeps .quick-init/ in the repository root .gitignore', async () => {
    const raw = await readFile(path.join(process.cwd(), '.gitignore'), 'utf8')
    expect(raw).toContain('.quick-init/')
  })

  it('merges partial local config with defaults and rejects invalid field shapes', async () => {
    const cwd = await tempDir()
    await mkdir(path.join(cwd, '.quick-init'), { recursive: true })
    await writeFile(
      path.join(cwd, '.quick-init/config.json'),
      JSON.stringify(
        {
          archive: {
            enabled: false,
            timeoutMs: 'invalid'
          },
          hooks: {
            preCommitArchive: 'invalid'
          }
        },
        null,
        2
      ),
      'utf8'
    )

    const config = await ensureLocalConfig(cwd)
    expect(config).toEqual({
      archive: {
        enabled: false,
        autoStage: true,
        aiSummary: true,
        model: 'cheap',
        timeoutMs: 30000,
        fallbackToManifestOnly: true
      },
      hooks: {
        preCommitArchive: true
      }
    })
  })
})
