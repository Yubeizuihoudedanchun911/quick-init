import { CommandResult } from '../core/types.js'
import { runGit } from './git.js'

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return 'Scoped commit failed'
}

export async function scopedCommit(cwd: string, paths: string[], message: string): Promise<CommandResult> {
  if (paths.length === 0) {
    return { ok: false, message: 'No paths provided for scoped commit' }
  }

  try {
    await runGit(cwd, ['add', '--', ...paths])
    await runGit(cwd, ['diff', '--cached', '--check'])
    await runGit(cwd, ['commit', '-m', message])
    return { ok: true, message, changedFiles: paths }
  } catch (error) {
    return { ok: false, message: errorMessage(error) }
  }
}
