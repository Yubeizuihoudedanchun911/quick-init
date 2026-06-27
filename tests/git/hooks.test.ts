import { execFile } from 'node:child_process'
import { lstat, mkdtemp, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
import { installPreCommitHook } from '../../src/git/hooks.js'
import { makeTempRepo, writeRepoFile } from '../helpers/tempRepo.js'

const execFileAsync = promisify(execFile)

describe('installPreCommitHook', () => {
  it('installs a pre-commit hook that calls quick-init archive --staged', async () => {
    const cwd = await makeTempRepo()

    await installPreCommitHook(cwd)

    const hook = await readFile(path.join(cwd, '.git/hooks/pre-commit'), 'utf8')
    expect(hook).toContain('# quick-init hook start')
    expect(hook).toContain('quick-init archive --staged')
    expect(hook).toContain('# quick-init hook end')
  })

  it('keeps a single quick-init hook block when installed twice', async () => {
    const cwd = await makeTempRepo()

    await installPreCommitHook(cwd)
    await installPreCommitHook(cwd)

    const hook = await readFile(path.join(cwd, '.git/hooks/pre-commit'), 'utf8')
    expect(hook.match(/quick-init archive --staged/g)).toHaveLength(1)
  })

  it('installs the hook at the git worktree path returned by rev-parse', async () => {
    const cwd = await makeTempRepo()
    await writeRepoFile(cwd, 'README.md', '# quick-init\n')
    await execFileAsync('git', ['add', 'README.md'], { cwd })
    await execFileAsync('git', ['commit', '-m', 'initial commit'], { cwd })

    const worktreeDir = await mkdtemp(path.join(os.tmpdir(), 'quick-init-worktree-'))
    await execFileAsync('git', ['worktree', 'add', '--detach', worktreeDir], { cwd })

    const { stdout } = await execFileAsync(
      'git',
      ['rev-parse', '--git-path', 'hooks/pre-commit'],
      { cwd: worktreeDir },
    )
    const hookPath = path.resolve(worktreeDir, stdout.trim())
    const installedHookPath = await installPreCommitHook(worktreeDir)

    expect(installedHookPath).toBe(stdout.trim())

    const gitDirStat = await lstat(path.join(worktreeDir, '.git'))
    expect(gitDirStat.isFile()).toBe(true)
    expect(hookPath).not.toBe(path.join(worktreeDir, '.git', 'hooks', 'pre-commit'))

    const hook = await readFile(hookPath, 'utf8')
    expect(hook).toContain('# quick-init hook start')
    expect(hook).toContain('quick-init archive --staged')
    expect(hook).toContain('# quick-init hook end')
  })
})
