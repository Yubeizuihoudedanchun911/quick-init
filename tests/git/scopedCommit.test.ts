import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
import { scopedCommit } from '../../src/git/scopedCommit.js'
import { makeTempRepo, writeRepoFile } from '../helpers/tempRepo.js'

const execFileAsync = promisify(execFile)

describe('scopedCommit', () => {
  it('commits only the listed paths and leaves unrelated files untracked', async () => {
    const cwd = await makeTempRepo()
    await writeRepoFile(cwd, 'CLAUDE.md', '# Claude\n')
    await writeRepoFile(cwd, 'user-work.md', '# User Work\n')

    const result = await scopedCommit(cwd, ['CLAUDE.md'], 'docs: scoped commit')
    expect(result.ok).toBe(true)

    const { stdout } = await execFileAsync('git', ['status', '--short'], { cwd })
    expect(stdout).toContain('?? user-work.md')
    expect(stdout).not.toContain('CLAUDE.md')
  })

  it('refuses to scope commit .quick-init paths and leaves them unstaged', async () => {
    const cwd = await makeTempRepo()
    await writeRepoFile(cwd, '.quick-init/config.json', '{"mode":"local"}\n')

    const result = await scopedCommit(cwd, ['.quick-init/config.json'], 'docs: rejected')
    expect(result.ok).toBe(false)
    expect(result.message).toContain('.quick-init')

    const { stdout: cached } = await execFileAsync('git', ['diff', '--cached', '--name-only'], {
      cwd,
    })
    expect(cached.trim()).toBe('')

    const { stdout: status } = await execFileAsync(
      'git',
      ['status', '--short', '--untracked-files=all'],
      { cwd },
    )
    expect(status).toContain('?? .quick-init/config.json')
  })
})
