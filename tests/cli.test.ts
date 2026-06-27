import { describe, expect, it } from 'vitest'
import { mkdtemp } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import path from 'node:path'
import os from 'node:os'
import { promisify } from 'node:util'
import { runCli } from '../src/cli.js'
import { toIterationSlug } from '../src/archive/slug.js'

import { makeTempRepo, writeRepoFile } from './helpers/tempRepo.js'

const execFileAsync = promisify(execFile)

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

  it('dispatches archive command with --staged', async () => {
    const cwd = await makeTempRepo()
    await writeRepoFile(cwd, 'docs/specs/payment.md', '# 支付流程设计\n')
    await execFileAsync('git', ['add', 'docs/specs/payment.md'], { cwd })

    const result = await runCli(['archive', '--staged'], cwd)
    expect(result.ok).toBe(true)
    expect(result.message).toContain('Archived Markdown into')
    const today = new Date().toISOString().slice(0, 10)
    const expectedIteration = `${today}-${toIterationSlug('支付流程设计')}`
    expect(result.changedFiles).toEqual([`docs/iterations/${expectedIteration}/specs/payment.md`])
  })

  it('requires --staged for archive command', async () => {
    const cwd = await makeTempRepo()
    await writeRepoFile(cwd, 'docs/specs/payment.md', '# 支付流程设计\n')
    await execFileAsync('git', ['add', 'docs/specs/payment.md'], { cwd })

    const result = await runCli(['archive'], cwd)
    expect(result.ok).toBe(false)
    expect(result.message).toContain('requires --staged')
  })
})
