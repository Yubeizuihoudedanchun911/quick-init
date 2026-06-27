import { toIterationSlug } from '../archive/slug.js'
import { CommandResult } from '../core/types.js'
import { clearActiveIteration, readActiveIteration, writeActiveIteration } from '../local/state.js'

const USAGE = 'Usage: quick-init iteration <status|start|close>'

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
    await clearActiveIteration(cwd)
    return { ok: true, message: 'Closed active iteration' }
  }

  return { ok: false, message: USAGE }
}
