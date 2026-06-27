import { describe, expect, it } from 'vitest'
import { access, chmod, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { runInitCommand } from '../../src/init/initCommand.js'
import { makeTempRepo, writeRepoFile } from '../helpers/tempRepo.js'

const execFileAsync = promisify(execFile)

async function listFiles(root: string, relativePath = ''): Promise<string[]> {
  const dirPath = relativePath ? path.join(root, relativePath) : root
  const entries = await readdir(dirPath, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const nextRelativePath = path.join(relativePath, entry.name)
    if (entry.isDirectory()) {
      files.push(...await listFiles(root, nextRelativePath))
      continue
    }
    files.push(nextRelativePath)
  }

  return files
}

describe('runInitCommand', () => {
  it('initializes a non-Git directory, installs the hook, and creates the initial commit', async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'quick-init-init-'))
    const result = await runInitCommand('TypeScript CLI 工具', cwd)
    expect(result.ok).toBe(true)

    const { stdout: isRepo } = await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'], { cwd })
    expect(isRepo.trim()).toBe('true')

    await access(path.join(cwd, 'CLAUDE.md'))
    await access(path.join(cwd, 'agents/documentation.md'))
    await access(path.join(cwd, '.quick-init/config.json'))
    await access(path.join(cwd, 'docs/iterations'))
    const gitignore = await readFile(path.join(cwd, '.gitignore'), 'utf8')
    expect(gitignore).toContain('.quick-init/')
    const hook = await readFile(path.join(cwd, '.git/hooks/pre-commit'), 'utf8')
    expect(hook).toContain('quick-init archive --staged')

    const iterationDirs = await readdir(path.join(cwd, 'docs/iterations'), { withFileTypes: true })
    const iterationDir = iterationDirs.find((entry) => entry.isDirectory())?.name
    expect(iterationDir).toBeDefined()
    const manifest = JSON.parse(
      await readFile(path.join(cwd, 'docs/iterations', iterationDir as string, 'manifest.json'), 'utf8')
    )
    expect(manifest.hookInstalled).toBe(true)
    expect(manifest.gitInitialized).toBe(true)
    expect(manifest.localFiles).toContain('.quick-init/config.json')
    const { stdout: hookPath } = await execFileAsync(
      'git',
      ['rev-parse', '--git-path', 'hooks/pre-commit'],
      { cwd },
    )
    expect(manifest.localFiles).toContain(hookPath.trim())

    const { stdout } = await execFileAsync('git', ['log', '--oneline', '-1'], { cwd })
    expect(stdout).toContain('chore: initialize quick-init governance')
  })

  it('returns a clear failure and skips the archive commit when hook installation fails', async () => {
    const cwd = await makeTempRepo()
    await chmod(path.join(cwd, '.git/hooks'), 0o500)

    const result = await runInitCommand('TypeScript CLI 工具', cwd)
    expect(result.ok).toBe(false)
    expect(result.message).toContain('Failed to install pre-commit hook')

    await expect(execFileAsync('git', ['rev-parse', '--verify', 'HEAD'], { cwd })).rejects.toThrow()

    const files = await listFiles(path.join(cwd, 'docs/iterations'))
    expect(files.some((file) => file.endsWith('manifest.json'))).toBe(false)
  })

  it('cleans up archive files when initial scoped commit fails', async () => {
    const cwd = await makeTempRepo()
    await writeFile(path.join(cwd, '.git', 'hooks', 'prepare-commit-msg'), '#!/usr/bin/env bash\nexit 1\n', 'utf8')
    await chmod(path.join(cwd, '.git', 'hooks', 'prepare-commit-msg'), 0o755)

    const result = await runInitCommand('TypeScript CLI 工具', cwd)
    expect(result.ok).toBe(false)
    expect(result.message).toContain('Command failed: git commit')
    await expect(execFileAsync('git', ['log', '--oneline', '-1'], { cwd })).rejects.toThrow()

    let archiveFiles: string[] = []
    try {
      archiveFiles = await listFiles(path.join(cwd, 'docs/iterations'))
    } catch {
      archiveFiles = []
    }
    expect(archiveFiles.some((file) => file.endsWith('manifest.json'))).toBe(false)
    expect(archiveFiles.some((file) => file.endsWith('iteration.md'))).toBe(false)
  })

  it('does not commit unrelated dirty files', async () => {
    const cwd = await makeTempRepo()
    await writeRepoFile(cwd, 'user-note.md', '# User note\n')
    await runInitCommand('TypeScript CLI 工具', cwd)
    const { stdout } = await execFileAsync('git', ['status', '--short'], { cwd })
    expect(stdout).toContain('?? user-note.md')
  })
})
