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
})
