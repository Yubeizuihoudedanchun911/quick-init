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
