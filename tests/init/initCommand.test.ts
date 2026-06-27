import { describe, expect, it } from 'vitest'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { runInitCommand } from '../../src/init/initCommand.js'
import { makeTempRepo, writeRepoFile } from '../helpers/tempRepo.js'

const execFileAsync = promisify(execFile)

describe('runInitCommand', () => {
  it('generates governance files, local config, hook, and initial commit', async () => {
    const cwd = await makeTempRepo()
    const result = await runInitCommand('TypeScript CLI 工具', cwd)
    expect(result.ok).toBe(true)

    await access(path.join(cwd, 'CLAUDE.md'))
    await access(path.join(cwd, 'agents/documentation.md'))
    await access(path.join(cwd, '.quick-init/config.json'))
    await access(path.join(cwd, 'docs/iterations'))
    const gitignore = await readFile(path.join(cwd, '.gitignore'), 'utf8')
    expect(gitignore).toContain('.quick-init/')
    const hook = await readFile(path.join(cwd, '.git/hooks/pre-commit'), 'utf8')
    expect(hook).toContain('quick-init archive --staged')
    const { stdout } = await execFileAsync('git', ['log', '--oneline', '-1'], { cwd })
    expect(stdout).toContain('chore: initialize quick-init governance')
  })

  it('does not commit unrelated dirty files', async () => {
    const cwd = await makeTempRepo()
    await writeRepoFile(cwd, 'user-note.md', '# User note\n')
    await runInitCommand('TypeScript CLI 工具', cwd)
    const { stdout } = await execFileAsync('git', ['status', '--short'], { cwd })
    expect(stdout).toContain('?? user-note.md')
  })
})
