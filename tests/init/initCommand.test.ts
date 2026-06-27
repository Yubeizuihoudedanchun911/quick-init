import { describe, expect, it, vi } from 'vitest'
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
    expect(manifest.localFiles).toContain(path.resolve(cwd, hookPath.trim()))

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
    await execFileAsync('git', ['config', 'user.name', ''], { cwd })
    await execFileAsync('git', ['config', 'user.email', ''], { cwd })

    const result = await runInitCommand('TypeScript CLI 工具', cwd)
    expect(result.ok).toBe(false)
    expect(result.message).toContain('Author identity unknown')
    await expect(execFileAsync('git', ['log', '--oneline', '-1'], { cwd })).rejects.toThrow()
    const { stdout: staged } = await execFileAsync('git', ['diff', '--cached', '--name-only'], { cwd })
    const stagedFiles = staged.split('\n').map((line) => line.trim()).filter(Boolean)
    expect(stagedFiles.some((path) => /docs\/iterations\/\d{4}-\d{2}-\d{2}-初始化工程治理\/iteration\.md$/.test(path))).toBe(
      false,
    )
    expect(
      stagedFiles.some((path) =>
        /docs\/iterations\/\d{4}-\d{2}-\d{2}-初始化工程治理\/manifest\.json$/.test(path),
      ),
    ).toBe(false)

    let archiveFiles: string[] = []
    try {
      archiveFiles = await listFiles(path.join(cwd, 'docs/iterations'))
    } catch {
      archiveFiles = []
    }
    expect(archiveFiles.some((file) => file.endsWith('manifest.json'))).toBe(false)
    expect(archiveFiles.some((file) => file.endsWith('iteration.md'))).toBe(false)
  })

  it('fails when initial archive files already exist and preserves existing content', async () => {
    const cwd = await makeTempRepo()
    const fixedDate = new Date('2026-06-27T00:00:00.000Z')
    const iterationDir = `${fixedDate.toISOString().slice(0, 10)}-初始化工程治理`
    const iterationPath = `docs/iterations/${iterationDir}/iteration.md`
    const manifestPath = `docs/iterations/${iterationDir}/manifest.json`
    const existingIteration = '# 已有归档\n'
    const existingManifest = '{"type":"existing"}\n'

    await writeRepoFile(cwd, iterationPath, existingIteration)
    await writeRepoFile(cwd, manifestPath, existingManifest)

    vi.useFakeTimers()
    vi.setSystemTime(fixedDate)
    try {
      const result = await runInitCommand('TypeScript CLI 工具', cwd)
      expect(result.ok).toBe(false)
      expect(result.message).toContain('Initial archive file already exists')
    } finally {
      vi.useRealTimers()
    }

    const finalIteration = await readFile(path.join(cwd, iterationPath), 'utf8')
    const finalManifest = await readFile(path.join(cwd, manifestPath), 'utf8')
    expect(finalIteration).toBe(existingIteration)
    expect(finalManifest).toBe(existingManifest)
  })

  it('does not commit unrelated dirty files', async () => {
    const cwd = await makeTempRepo()
    await writeRepoFile(cwd, 'user-note.md', '# User note\n')
    await runInitCommand('TypeScript CLI 工具', cwd)
    const { stdout } = await execFileAsync('git', ['status', '--short'], { cwd })
    expect(stdout).toContain('?? user-note.md')
  })
})
