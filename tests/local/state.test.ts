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
