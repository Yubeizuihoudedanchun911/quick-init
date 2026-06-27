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
    expect(raw.match(/\.quick-init\//g)).toHaveLength(1)
  })
})
