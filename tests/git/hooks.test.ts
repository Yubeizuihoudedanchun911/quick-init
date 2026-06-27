import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { installPreCommitHook } from '../../src/git/hooks.js'
import { makeTempRepo } from '../helpers/tempRepo.js'

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
})
