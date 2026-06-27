import { CommandResult } from '../core/types.js'
import path from 'node:path'
import { runGit } from './git.js'

const QUICK_INIT_DIR = '.quick-init'

function isQuickInitPath(filePath: string): boolean {
  const segments = path.normalize(filePath).split(path.sep).filter(Boolean)
  return segments.includes(QUICK_INIT_DIR)
}

function isProtectedQuickInitStagedPath(filePath: string): boolean {
  return filePath === QUICK_INIT_DIR || filePath.startsWith(`${QUICK_INIT_DIR}/`)
}

async function unstageProtectedPaths(cwd: string, paths: string[]): Promise<void> {
  try {
    await runGit(cwd, ['rev-parse', '--verify', '--quiet', 'HEAD'])
    await runGit(cwd, ['reset', '--', ...paths])
  } catch {
    await runGit(cwd, ['rm', '--cached', '--', ...paths])
  }
}

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

  if (paths.some(isQuickInitPath)) {
    return { ok: false, message: 'Refusing to scope commit .quick-init paths' }
  }

  try {
    await runGit(cwd, ['add', '--', ...paths])
    const stagedOutput = await runGit(cwd, ['diff', '--cached', '--name-only'])
    const stagedPaths = stagedOutput.split('\n').map((line) => line.trim()).filter(Boolean)
    const protectedPaths = stagedPaths.filter(isProtectedQuickInitStagedPath)

    if (protectedPaths.length > 0) {
      await unstageProtectedPaths(cwd, protectedPaths)
      return { ok: false, message: 'Refusing to scope commit .quick-init paths' }
    }

    await runGit(cwd, ['diff', '--cached', '--check'])
    await runGit(cwd, ['commit', '-m', message])
    return { ok: true, message, changedFiles: paths }
  } catch (error) {
    return { ok: false, message: errorMessage(error) }
  }
}
