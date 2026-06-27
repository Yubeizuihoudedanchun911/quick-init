import { describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { runCli } from '../../src/cli.js'
import { runIterationCommand } from '../../src/iteration/commands.js'
import { toIterationSlug } from '../../src/archive/slug.js'
import { readActiveIteration } from '../../src/local/state.js'

async function tempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'quick-init-iteration-'))
}

describe('runIterationCommand', () => {
  it('starts, reports, and closes a local active iteration', async () => {
    const cwd = await tempDir()
    const name = '支付流程设计'
    const today = new Date().toISOString().slice(0, 10)
    const expectedIteration = `${today}-${toIterationSlug(name)}`

    const started = await runIterationCommand(['start', name], cwd)
    expect(started).toEqual({
      ok: true,
      message: `Started iteration: ${expectedIteration}`
    })
    expect(await readActiveIteration(cwd)).toMatchObject({
      iteration: expectedIteration,
      iterationPath: `docs/iterations/${expectedIteration}`
    })

    const active = await runIterationCommand(['status'], cwd)
    expect(active).toEqual({
      ok: true,
      message: `Active iteration: ${expectedIteration}`
    })

    const closed = await runIterationCommand(['close'], cwd)
    expect(closed).toEqual({
      ok: true,
      message: 'Closed active iteration'
    })

    const empty = await runIterationCommand(['status'], cwd)
    expect(empty).toEqual({
      ok: true,
      message: 'No active iteration'
    })
  })

  it('rejects an empty iteration name', async () => {
    const cwd = await tempDir()
    const result = await runIterationCommand(['start', '   '], cwd)
    expect(result).toEqual({
      ok: false,
      message: 'iteration start requires a name'
    })
  })

  it('marks an active iteration manifest closed when closing local state', async () => {
    const cwd = await tempDir()
    const started = await runIterationCommand(['start', '支付流程设计'], cwd)
    expect(started.ok).toBe(true)
    const state = await readActiveIteration(cwd)
    expect(state).not.toBeNull()
    const manifestPath = path.join(cwd, state!.iterationPath, 'manifest.json')

    await mkdir(path.dirname(manifestPath), { recursive: true })
    await writeFile(
      manifestPath,
      `${JSON.stringify(
        {
          iteration: state!.iteration,
          status: 'active',
          summaryStatus: 'degraded',
          slugSource: {
            type: 'markdown-title',
            path: 'docs/specs/payment.md',
            title: '支付流程设计'
          },
          archiveRuns: []
        },
        null,
        2
      )}\n`,
      'utf8'
    )

    const closed = await runIterationCommand(['close'], cwd)
    expect(closed.ok).toBe(true)
    expect(closed.changedFiles).toEqual([`${state!.iterationPath}/manifest.json`])
    expect(await readActiveIteration(cwd)).toBeNull()
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    expect(manifest.status).toBe('closed')
  })

  it('returns usage for unknown iteration commands', async () => {
    const cwd = await tempDir()
    const result = await runIterationCommand(['unknown'], cwd)
    expect(result).toEqual({
      ok: false,
      message: 'Usage: quick-init iteration <status|start|close>'
    })
  })
})

describe('runCli iteration branch', () => {
  it('dispatches iteration commands', async () => {
    const cwd = await tempDir()
    const today = new Date().toISOString().slice(0, 10)
    const expectedIteration = `${today}-${toIterationSlug('支付流程设计')}`

    const started = await runCli(['iteration', 'start', '支付流程设计'], cwd)
    expect(started.ok).toBe(true)
    expect(started.message).toBe(`Started iteration: ${expectedIteration}`)

    const status = await runCli(['iteration', 'status'], cwd)
    expect(status.ok).toBe(true)
    expect(status.message).toBe(`Active iteration: ${expectedIteration}`)
  })
})
