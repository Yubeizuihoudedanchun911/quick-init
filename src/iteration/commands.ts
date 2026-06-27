import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { toIterationSlug } from '../archive/slug.js'
import { CommandResult } from '../core/types.js'
import { clearActiveIteration, readActiveIteration, writeActiveIteration } from '../local/state.js'

const USAGE = 'Usage: quick-init iteration <status|start|close>'

function safeIterationName(iteration: string): string | null {
  const trimmed = iteration.trim()
  if (trimmed.length === 0 || trimmed !== iteration) {
    return null
  }
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    return null
  }
  return trimmed
}

async function closeIterationManifest(cwd: string, iteration: string): Promise<string | null> {
  const safeIteration = safeIterationName(iteration)
  if (!safeIteration) {
    return null
  }

  const manifestRelativePath = `docs/iterations/${safeIteration}/manifest.json`
  const manifestPath = path.join(cwd, manifestRelativePath)
  let raw: string
  try {
    raw = await readFile(manifestPath, 'utf8')
  } catch {
    return null
  }

  const manifest = JSON.parse(raw) as { status?: string }
  manifest.status = 'closed'
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  return manifestRelativePath
}

export async function runIterationCommand(args: string[], cwd: string): Promise<CommandResult> {
  const [subcommand, ...rest] = args

  if (subcommand === 'status') {
    const state = await readActiveIteration(cwd)
    if (!state) {
      return { ok: true, message: 'No active iteration' }
    }
    return { ok: true, message: `Active iteration: ${state.iteration}` }
  }

  if (subcommand === 'start') {
    const name = rest.join(' ').trim()
    if (!name) {
      return { ok: false, message: 'iteration start requires a name' }
    }

    const updatedAt = new Date().toISOString()
    const iteration = `${updatedAt.slice(0, 10)}-${toIterationSlug(name)}`
    await writeActiveIteration(cwd, {
      iteration,
      iterationPath: `docs/iterations/${iteration}`,
      updatedAt
    })

    return { ok: true, message: `Started iteration: ${iteration}` }
  }

  if (subcommand === 'close') {
    const state = await readActiveIteration(cwd)
    let changedFiles: string[] | undefined
    if (state) {
      const manifestPath = await closeIterationManifest(cwd, state.iteration)
      changedFiles = manifestPath ? [manifestPath] : undefined
    }
    await clearActiveIteration(cwd)
    return { ok: true, message: 'Closed active iteration', changedFiles }
  }

  return { ok: false, message: USAGE }
}
