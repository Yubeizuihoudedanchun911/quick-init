import { describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { makeTempRepo } from './helpers/tempRepo.js'

const execFileAsync = promisify(execFile)

describe('makeTempRepo', () => {
  it('creates a real git work tree', async () => {
    const repo = await makeTempRepo()
    const { stdout } = await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: repo,
    })
    expect(stdout.trim()).toBe('true')
  })

  it('configures local git user identity', async () => {
    const repo = await makeTempRepo()
    const [{ stdout: name }, { stdout: email }] = await Promise.all([
      execFileAsync('git', ['config', 'user.name'], { cwd: repo }),
      execFileAsync('git', ['config', 'user.email'], { cwd: repo }),
    ])
    expect(name.trim()).toBe('Quick Init Test')
    expect(email.trim()).toBe('quick-init-test@local')
  })
})
