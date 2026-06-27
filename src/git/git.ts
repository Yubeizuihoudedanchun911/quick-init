import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export async function runGit(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd })
  return stdout
}

export async function ensureGitRepository(cwd: string): Promise<{ initialized: boolean }> {
  try {
    await runGit(cwd, ['rev-parse', '--is-inside-work-tree'])
    return { initialized: false }
  } catch {
    await runGit(cwd, ['init'])
    return { initialized: true }
  }
}
