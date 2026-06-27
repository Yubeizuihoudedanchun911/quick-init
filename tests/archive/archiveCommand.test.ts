import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { access, chmod, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import path from 'node:path'
import os from 'node:os'
import { promisify } from 'node:util'

import { buildManifest } from '../../src/archive/manifest.js'
import { resolveIterationTarget } from '../../src/archive/activeIteration.js'
import { renderIterationMarkdown } from '../../src/archive/iterationText.js'
import { toIterationSlug } from '../../src/archive/slug.js'
import { runArchiveCommand } from '../../src/archive/archiveCommand.js'
import * as git from '../../src/git/git.js'
import { writeActiveIteration } from '../../src/local/state.js'
import { makeTempRepo, writeRepoFile } from '../helpers/tempRepo.js'

const execFileAsync = promisify(execFile)

import type { ArchiveDocument, ArchiveManifest } from '../../src/core/types.js'

async function tempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'quick-init-task8-'))
}

function sampleArchiveDocs(contentPath = 'docs/specs/payment.md'): ArchiveDocument[] {
  return [
    {
      sourcePath: contentPath,
      archivePath: null,
      category: 'specs',
      action: 'archive',
      reason: 'classified for archive',
      sha256: 'a'.repeat(64)
    }
  ]
}

function splitStagedLines(stdout: string): string[] {
  return stdout.split('\0').filter(Boolean)
}

function splitNameStatusLines(stdout: string): string[] {
  return stdout
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((line) => {
      const fields = line.split('\t').map((field) => {
        if (field.startsWith('"') && field.endsWith('"')) {
          return field.slice(1, -1)
        }
        return field
      })
      return fields.join('\t')
    })
}

describe('runArchiveCommand', () => {
  it('returns failure when staged flag is not provided', async () => {
    const cwd = await makeTempRepo()
    await writeRepoFile(cwd, 'docs/specs/payment.md', '# 支付流程设计\n\n')
    await execFileAsync('git', ['add', 'docs/specs/payment.md'], { cwd })

    const result = await runArchiveCommand(cwd, { staged: false })
    expect(result.ok).toBe(false)
    expect(result.message).toContain('requires --staged')
  })

  it('returns ok when there are no staged markdown files', async () => {
    const cwd = await makeTempRepo()
    await writeRepoFile(cwd, 'src/index.ts', 'export const value = 1\n')
    await execFileAsync('git', ['add', 'src/index.ts'], { cwd })

    const result = await runArchiveCommand(cwd, { staged: true })
    expect(result.ok).toBe(true)
    expect(result.message).toContain('No staged Markdown files')
  })

  it('moves archive-able staged markdown and writes manifest and iteration state', async () => {
    const cwd = await makeTempRepo()
    await writeRepoFile(cwd, 'docs/specs/payment.md', '# 支付流程设计\n\n设计内容\n')
    await execFileAsync('git', ['add', 'docs/specs/payment.md'], { cwd })
    await execFileAsync('git', ['commit', '-m', 'seed', '--no-gpg-sign'], { cwd })
    await writeRepoFile(cwd, 'docs/specs/payment.md', '# 支付流程设计\n\n设计内容\n更新')
    await execFileAsync('git', ['add', 'docs/specs/payment.md'], { cwd })

    const result = await runArchiveCommand(cwd, { staged: true })
    expect(result.ok).toBe(true)
    const changedFiles = result.changedFiles ?? []
    expect(changedFiles).toHaveLength(1)

    const [archivePath] = changedFiles
    const iterationPath = archivePath.replace('/specs/payment.md', '')
    const expectedIteration = iterationPath.split('/').at(-1)

    await expect(readFile(path.join(cwd, archivePath), 'utf8')).resolves.toContain('设计内容')
    await expect(access(path.join(cwd, iterationPath, 'manifest.json'))).resolves.toBeUndefined()

    const manifestText = await readFile(path.join(cwd, iterationPath, 'manifest.json'), 'utf8')
    const manifest = JSON.parse(manifestText)
    expect(manifest.archiveRuns[0].documents[0].action).toBe('archive')
    expect(manifest.archiveRuns[0].documents[0].archivePath).toBe(archivePath)
    expect(manifest.summaryStatus).toBe('degraded')

    const active = await readFile(path.join(cwd, '.quick-init', 'state', 'active-iteration.json'), 'utf8')
    const activeState = JSON.parse(active)
    expect(activeState.iteration).toBe(expectedIteration)
    expect(activeState.iterationPath).toBe(iterationPath)

    const { stdout } = await execFileAsync('git', ['diff', '--cached', '--name-status'], { cwd })
    const stagedPaths = splitNameStatusLines(stdout)
    const hasSourceRemovalStatus = stagedPaths.some(
      (entry) =>
        entry === `D\tdocs/specs/payment.md` || (entry.startsWith('R') && entry.includes('\tdocs/specs/payment.md\t'))
    )
    expect(hasSourceRemovalStatus).toBe(true)
    const hasArchivedPathStaged = stagedPaths.some(
      (entry) =>
        (entry.startsWith('A\t') && entry.endsWith('/specs/payment.md')) ||
        (entry.startsWith('R') && entry.endsWith('/specs/payment.md'))
    )
    expect(hasArchivedPathStaged).toBe(true)
    expect(stagedPaths.some((entry) => entry.endsWith('/manifest.json'))).toBe(true)
    expect(stagedPaths.some((entry) => entry.endsWith('/iteration.md'))).toBe(true)

    const iterationMarkdown = await readFile(path.join(cwd, iterationPath, 'iteration.md'), 'utf8')
    expect(iterationMarkdown).toContain(`AI summary unavailable for ${expectedIteration}`)

    expect(result.changedFiles).toEqual([archivePath])
  })

  it('archives staged markdown content when the working tree file is missing', async () => {
    const cwd = await makeTempRepo()
    await writeRepoFile(cwd, 'docs/specs/payment.md', '# 支付流程设计\n\n设计内容\n')
    await execFileAsync('git', ['add', 'docs/specs/payment.md'], { cwd })
    await rm(path.join(cwd, 'docs/specs/payment.md'))

    const result = await runArchiveCommand(cwd, { staged: true })
    expect(result.ok).toBe(true)

    const archivePath = result.changedFiles?.[0]
    expect(archivePath).toBeDefined()
    await expect(readFile(path.join(cwd, archivePath!), 'utf8')).resolves.toContain('设计内容')
    await expect(access(path.join(cwd, 'docs/specs/payment.md'))).rejects.toThrow()
  })

  it('archives staged markdown content without consuming unstaged working tree edits', async () => {
    const cwd = await makeTempRepo()
    const sourcePath = 'docs/specs/payment.md'

    await writeRepoFile(cwd, sourcePath, '# 原始支付流程\n\n旧版本\n')
    await execFileAsync('git', ['add', sourcePath], { cwd })
    await execFileAsync('git', ['commit', '-m', 'seed', '--no-gpg-sign'], { cwd })
    await writeRepoFile(cwd, sourcePath, '# 支付流程设计\n\n已暂存版本\n')
    await execFileAsync('git', ['add', sourcePath], { cwd })
    await writeRepoFile(cwd, sourcePath, '# 未暂存标题\n\n未暂存版本\n')

    const result = await runArchiveCommand(cwd, { staged: true })
    expect(result.ok).toBe(true)

    const archivePath = result.changedFiles?.[0]
    expect(archivePath).toBe(
      `docs/iterations/${new Date().toISOString().slice(0, 10)}-${toIterationSlug('支付流程设计')}/specs/payment.md`
    )
    await expect(readFile(path.join(cwd, archivePath!), 'utf8')).resolves.toContain('已暂存版本')
    await expect(readFile(path.join(cwd, archivePath!), 'utf8')).resolves.not.toContain('未暂存版本')
    await expect(readFile(path.join(cwd, sourcePath), 'utf8')).resolves.toContain('未暂存版本')

    const { stdout: stagedArchiveContent } = await execFileAsync('git', ['show', `:${archivePath}`], { cwd })
    expect(stagedArchiveContent).toContain('已暂存版本')
    expect(stagedArchiveContent).not.toContain('未暂存版本')
  })

  it('writes manifest first then cleans up manifest when iteration markdown write fails', async () => {
    const cwd = await makeTempRepo()
    const sourcePath = 'docs/specs/payment.md'
    const expectedIteration = `${new Date().toISOString().slice(0, 10)}-${toIterationSlug('支付流程设计')}`
    const iterationPath = `docs/iterations/${expectedIteration}`
    const manifestPath = path.join(cwd, iterationPath, 'manifest.json')
    const iterationMarkdownPath = path.join(cwd, iterationPath, 'iteration.md')

    await writeRepoFile(cwd, sourcePath, '# 支付流程设计\n\n设计内容\n')
    await execFileAsync('git', ['add', sourcePath], { cwd })
    await mkdir(iterationMarkdownPath, { recursive: true })

    const result = await runArchiveCommand(cwd, { staged: true })
    expect(result.ok).toBe(false)

    await expect(readFile(path.join(cwd, sourcePath), 'utf8')).resolves.toContain('支付流程设计')
    await expect(access(manifestPath)).rejects.toThrow()
    await expect(access(iterationMarkdownPath)).rejects.toThrow()
    await expect(access(path.join(cwd, iterationPath, 'specs'))).rejects.toThrow()
    await expect(access(path.join(cwd, iterationPath))).rejects.toThrow()
  })

  it('restores previous active iteration when active state write fails', async () => {
    const cwd = await makeTempRepo()
    const sourcePath = 'docs/specs/payment.md'
    const today = new Date().toISOString().slice(0, 10)
    const expectedIteration = `${today}-${toIterationSlug('支付流程设计')}`
    const iterationPath = `docs/iterations/${expectedIteration}`
    const manifestPath = path.join(cwd, iterationPath, 'manifest.json')
    const iterationMarkdownPath = path.join(cwd, iterationPath, 'iteration.md')
    const activeStatePath = path.join(cwd, '.quick-init', 'state', 'active-iteration.json')
    const previousActive = {
      iteration: '2026-06-20-previous',
      iterationPath: 'docs/iterations/2026-06-20-previous',
      updatedAt: '2026-06-20T00:00:00.000Z'
    }

    await writeActiveIteration(cwd, previousActive)
    await chmod(activeStatePath, 0o444)
    await writeRepoFile(cwd, sourcePath, '# 支付流程设计\n\n设计内容\n')
    await execFileAsync('git', ['add', sourcePath], { cwd })

    const result = await runArchiveCommand(cwd, { staged: true })
    expect(result.ok).toBe(false)

    await expect(readFile(path.join(cwd, sourcePath), 'utf8')).resolves.toContain('支付流程设计')
    await expect(access(manifestPath)).rejects.toThrow()
    await expect(access(iterationMarkdownPath)).rejects.toThrow()
    const activeState = JSON.parse(await readFile(activeStatePath, 'utf8'))
    expect(activeState).toEqual(previousActive)
  })

  it('clears active iteration state when write fails and no previous active state exists', async () => {
    const cwd = await makeTempRepo()
    const sourcePath = 'docs/specs/payment.md'
    const today = new Date().toISOString().slice(0, 10)
    const expectedIteration = `${today}-${toIterationSlug('支付流程设计')}`
    const iterationPath = `docs/iterations/${expectedIteration}`
    const manifestPath = path.join(cwd, iterationPath, 'manifest.json')
    const iterationMarkdownPath = path.join(cwd, iterationPath, 'iteration.md')
    const activeStatePath = path.join(cwd, '.quick-init', 'state', 'active-iteration.json')

    await writeRepoFile(cwd, sourcePath, '# 支付流程设计\n\n设计内容\n')
    await execFileAsync('git', ['add', sourcePath], { cwd })
    await mkdir(activeStatePath, { recursive: true })

    const result = await runArchiveCommand(cwd, { staged: true })
    expect(result.ok).toBe(false)

    await expect(readFile(path.join(cwd, sourcePath), 'utf8')).resolves.toContain('支付流程设计')
    await expect(access(manifestPath)).rejects.toThrow()
    await expect(access(iterationMarkdownPath)).rejects.toThrow()
    await expect(readFile(activeStatePath)).rejects.toThrow()
  })

  it('keeps _README staged docs as skip and continues to write manifest', async () => {
    const cwd = await makeTempRepo()
    const sourcePath = 'docs/specs/_README.md'
    await writeRepoFile(cwd, sourcePath, '# 目录说明\n\n此文件仅作为标记。\n')
    await execFileAsync('git', ['add', sourcePath], { cwd })

    const result = await runArchiveCommand(cwd, { staged: true })
    expect(result.ok).toBe(true)

    const expectedIteration = `${new Date().toISOString().slice(0, 10)}-${toIterationSlug('目录说明')}`
    const iterationPath = `docs/iterations/${expectedIteration}`
    const manifest = JSON.parse(await readFile(path.join(cwd, iterationPath, 'manifest.json'), 'utf8'))

    expect(manifest.archiveRuns[0].documents).toHaveLength(1)
    expect(manifest.archiveRuns[0].documents[0]).toEqual(
      expect.objectContaining({
        sourcePath,
        action: 'skip',
        archivePath: null
      })
    )

    expect(result.changedFiles).toEqual([sourcePath])
    const { stdout } = await execFileAsync('git', ['diff', '--cached', '--name-status'], { cwd })
    const stagedPaths = splitNameStatusLines(stdout)
    expect(stagedPaths).toContain(`A\t${sourcePath}`)
    expect(stagedPaths.some((line) => line.includes(sourcePath) && line.includes('docs/iterations'))).toBe(false)
    expect(stagedPaths.some((entry) => entry.endsWith('/manifest.json'))).toBe(true)
    expect(stagedPaths.some((entry) => entry.endsWith('/iteration.md'))).toBe(true)

    const sourceContent = await readFile(path.join(cwd, sourcePath), 'utf8')
    expect(sourceContent).toContain('目录说明')
  })

  it('removes newly added archive source from staging while keeping archive paths staged', async () => {
    const cwd = await makeTempRepo()
    const sourcePath = 'docs/specs/new-payment.md'
    const expectedIteration = `${new Date().toISOString().slice(0, 10)}-${toIterationSlug('new-payment')}`
    const archivePath = `docs/iterations/${expectedIteration}/specs/new-payment.md`

    await writeRepoFile(cwd, sourcePath, '# new payment\n')
    await execFileAsync('git', ['add', sourcePath], { cwd })

    const result = await runArchiveCommand(cwd, { staged: true })
    expect(result.ok).toBe(true)

    const { stdout } = await execFileAsync('git', ['diff', '--cached', '--name-status'], { cwd })
    const stagedPaths = splitNameStatusLines(stdout)
    expect(stagedPaths).not.toContain(`A\t${sourcePath}`)
    expect(stagedPaths.some((entry) => entry.endsWith(`\t${archivePath}`))).toBe(true)
    expect(stagedPaths.some((entry) => entry.endsWith('/manifest.json'))).toBe(true)
    expect(stagedPaths.some((entry) => entry.endsWith('/iteration.md'))).toBe(true)
    expect(result.changedFiles).toEqual([archivePath])
  })

  it('keeps summarize-only docs in place but records them in manifest', async () => {
    const cwd = await makeTempRepo()
    await writeRepoFile(cwd, 'README.md', '# 预启动文档\n\n内容\n')
    await execFileAsync('git', ['add', 'README.md'], { cwd })

    const result = await runArchiveCommand(cwd, { staged: true })
    expect(result.ok).toBe(true)

    const today = new Date().toISOString().slice(0, 10)
    const expectedIteration = `${today}-${toIterationSlug('预启动文档')}`
    const iterationPath = `docs/iterations/${expectedIteration}`
    const manifest = JSON.parse(await readFile(path.join(cwd, iterationPath, 'manifest.json'), 'utf8'))

    expect(manifest.summaryStatus).toBe('degraded')
    expect(manifest.archiveRuns[0].documents).toHaveLength(1)
    expect(manifest.archiveRuns[0].documents[0]).toEqual(
      expect.objectContaining({
        sourcePath: 'README.md',
        action: 'summarize-only',
        archivePath: null
      })
    )

    expect(result.changedFiles).toEqual(['README.md'])
    expect(await access(path.join(cwd, 'README.md'))).toBeUndefined()
    await expect(readFile(path.join(cwd, iterationPath, 'iteration.md'), 'utf8')).resolves.toContain(
      '# ' + expectedIteration
    )
  })

  it('returns success and skips moving when archive is disabled', async () => {
    const cwd = await makeTempRepo()
    await writeRepoFile(cwd, 'docs/specs/payment.md', '# 支付流程设计\n\n')
    await writeRepoFile(
      cwd,
      '.quick-init/config.json',
      JSON.stringify({ archive: { enabled: false } })
    )
    await execFileAsync('git', ['add', 'docs/specs/payment.md'], { cwd })

    const result = await runArchiveCommand(cwd, { staged: true })
    expect(result.ok).toBe(true)
    expect(result.message).toContain('Archive is disabled by local config')

    const today = new Date().toISOString().slice(0, 10)
    const expectedIteration = `${today}-${toIterationSlug('支付流程设计')}`
    const iterationPath = `docs/iterations/${expectedIteration}`

    await expect(access(path.join(cwd, 'docs/specs/payment.md'))).resolves.toBeUndefined()
    await expect(access(path.join(cwd, iterationPath, 'manifest.json'))).rejects.toThrow()
  })

  it('rolls back all changed files when staging step fails', async () => {
    const cwd = await makeTempRepo()
    const sourcePath = 'docs/specs/payment.md'
    const iterationPathPrefix = `docs/iterations/${new Date().toISOString().slice(0, 10)}-支付流程设计`
    const archivePath = `${iterationPathPrefix}/specs/payment.md`

    await writeRepoFile(cwd, sourcePath, '# 支付流程设计\n\n')
    await execFileAsync('git', ['add', sourcePath], { cwd })

    await writeFile(path.join(cwd, '.git', 'index.lock'), '', 'utf8')

    const result = await runArchiveCommand(cwd, { staged: true })
    expect(result.ok).toBe(false)

    await expect(access(path.join(cwd, sourcePath))).resolves.toBeUndefined()
    await expect(access(path.join(cwd, archivePath))).rejects.toThrow()
    await expect(access(path.join(cwd, `${iterationPathPrefix}/manifest.json`))).rejects.toThrow()
    await expect(access(path.join(cwd, `${iterationPathPrefix}/iteration.md`))).rejects.toThrow()
    const { stdout } = await execFileAsync('git', ['diff', '--cached', '--name-status'], { cwd })
    const stagedPaths = splitNameStatusLines(stdout)
    expect(stagedPaths).toContain(`A\t${sourcePath}`)
    expect(stagedPaths).not.toContain(`D\t${sourcePath}`)
  })

  it('fails when removing source files from cache fails and rolls back changed files', async () => {
    const cwd = await makeTempRepo()
    const sourcePath = 'docs/specs/payment.md'
    const expectedIteration = `${new Date().toISOString().slice(0, 10)}-${toIterationSlug('支付流程设计')}`
    const iterationPath = `docs/iterations/${expectedIteration}`
    const manifestPath = path.join(cwd, iterationPath, 'manifest.json')
    const iterationMarkdownPath = path.join(cwd, iterationPath, 'iteration.md')
    const archivePath = path.join(cwd, iterationPath, 'specs', 'payment.md')
    const iterationDirectory = path.join(cwd, iterationPath)

    await writeRepoFile(cwd, sourcePath, '# 支付流程设计\n\n')
    await execFileAsync('git', ['add', sourcePath], { cwd })

    const originalRunGit = git.runGit
    const runGitSpy = vi.spyOn(git, 'runGit')
    runGitSpy.mockImplementation(async (repo, args) => {
      if (repo === cwd && args[0] === 'rm' && args.includes(sourcePath)) {
        await originalRunGit(repo, args as string[])
        throw new Error('simulated git rm cache failure')
      }

      return originalRunGit(repo, args as string[])
    })

    try {
      const result = await runArchiveCommand(cwd, { staged: true })

      expect(result.ok).toBe(false)
      expect(result.message).toContain('Failed to unstage staged source path from cache')

      await expect(readFile(path.join(cwd, sourcePath), 'utf8')).resolves.toContain('支付流程设计')
      await expect(access(archivePath)).rejects.toThrow()
      await expect(access(manifestPath)).rejects.toThrow()
      await expect(access(iterationMarkdownPath)).rejects.toThrow()
      await expect(access(path.join(iterationDirectory, 'specs'))).rejects.toThrow()
      await expect(access(iterationDirectory)).rejects.toThrow()

      const { stdout } = await execFileAsync('git', ['diff', '--cached', '--name-status'], { cwd })
      const stagedPaths = splitNameStatusLines(stdout)
      expect(stagedPaths).toContain(`A\t${sourcePath}`)
      expect(stagedPaths.every((entry) => !entry.includes('manifest.json'))).toBe(true)
      expect(stagedPaths.every((entry) => !entry.includes('iteration.md'))).toBe(true)
    } finally {
      runGitSpy.mockRestore()
    }
  })

  it('restores tracked staged source index entry when cache removal fails after index mutation', async () => {
    const cwd = await makeTempRepo()
    const sourcePath = 'docs/specs/payment.md'

    await writeRepoFile(cwd, sourcePath, '# 支付流程设计\n\n旧版本\n')
    await execFileAsync('git', ['add', sourcePath], { cwd })
    await execFileAsync('git', ['commit', '-m', 'seed', '--no-gpg-sign'], { cwd })
    await writeRepoFile(cwd, sourcePath, '# 支付流程设计\n\n新版本\n')
    await execFileAsync('git', ['add', sourcePath], { cwd })

    const originalRunGit = git.runGit
    const runGitSpy = vi.spyOn(git, 'runGit')
    runGitSpy.mockImplementation(async (repo, args) => {
      if (repo === cwd && args[0] === 'rm' && args.includes(sourcePath)) {
        await originalRunGit(repo, args as string[])
        throw new Error('simulated post-rm failure')
      }

      return originalRunGit(repo, args as string[])
    })

    try {
      const result = await runArchiveCommand(cwd, { staged: true })

      expect(result.ok).toBe(false)
      expect(result.message).toContain('Failed to unstage staged source path from cache')
      await expect(readFile(path.join(cwd, sourcePath), 'utf8')).resolves.toContain('新版本')

      const { stdout } = await execFileAsync('git', ['diff', '--cached', '--name-status'], { cwd })
      const stagedPaths = splitNameStatusLines(stdout)
      expect(stagedPaths).toContain(`M\t${sourcePath}`)
      expect(stagedPaths.every((entry) => !entry.includes('docs/iterations'))).toBe(true)

      const { stdout: stagedContent } = await execFileAsync('git', ['show', `:${sourcePath}`], { cwd })
      expect(stagedContent).toContain('新版本')
    } finally {
      runGitSpy.mockRestore()
    }
  })

  it('does not stage unrelated existing files under the active iteration directory', async () => {
    const cwd = await makeTempRepo()
    const iteration = '2026-06-27-payment'
    const iterationPath = `docs/iterations/${iteration}`
    const sourcePath = 'docs/specs/payment.md'
    const unrelatedPath = `${iterationPath}/notes.txt`

    await writeActiveIteration(cwd, {
      iteration,
      iterationPath,
      updatedAt: '2026-06-27T00:00:00.000Z'
    })
    await writeRepoFile(cwd, unrelatedPath, 'draft notes\n')
    await writeRepoFile(cwd, sourcePath, '# 支付流程设计\n\n设计内容\n')
    await execFileAsync('git', ['add', sourcePath], { cwd })

    const result = await runArchiveCommand(cwd, { staged: true })
    expect(result.ok).toBe(true)

    const { stdout } = await execFileAsync('git', ['diff', '--cached', '--name-status'], { cwd })
    const stagedPaths = splitNameStatusLines(stdout)
    expect(stagedPaths.some((entry) => entry.includes(unrelatedPath))).toBe(false)
    expect(stagedPaths.some((entry) => entry.endsWith('/manifest.json'))).toBe(true)
    expect(stagedPaths.some((entry) => entry.endsWith('/iteration.md'))).toBe(true)
  })

  it('preserves unrelated staged files under the active iteration directory when rollback runs', async () => {
    const cwd = await makeTempRepo()
    const iteration = '2026-06-27-payment'
    const iterationPath = `docs/iterations/${iteration}`
    const sourcePath = 'docs/specs/payment.md'
    const unrelatedPath = `${iterationPath}/notes.txt`

    await writeActiveIteration(cwd, {
      iteration,
      iterationPath,
      updatedAt: '2026-06-27T00:00:00.000Z'
    })
    await writeRepoFile(cwd, unrelatedPath, 'draft notes\n')
    await writeRepoFile(cwd, sourcePath, '# 支付流程设计\n\n设计内容\n')
    await execFileAsync('git', ['add', unrelatedPath, sourcePath], { cwd })

    const originalRunGit = git.runGit
    const runGitSpy = vi.spyOn(git, 'runGit')
    runGitSpy.mockImplementation(async (repo, args) => {
      if (repo === cwd && args[0] === 'rm' && args.includes(sourcePath)) {
        await originalRunGit(repo, args as string[])
        throw new Error('simulated source cache removal failure')
      }

      return originalRunGit(repo, args as string[])
    })

    try {
      const result = await runArchiveCommand(cwd, { staged: true })
      expect(result.ok).toBe(false)

      const { stdout } = await execFileAsync('git', ['diff', '--cached', '--name-status'], { cwd })
      const stagedPaths = splitNameStatusLines(stdout)
      expect(stagedPaths).toContain(`A\t${unrelatedPath}`)
      expect(stagedPaths).toContain(`A\t${sourcePath}`)
      expect(stagedPaths.every((entry) => !entry.includes('/manifest.json'))).toBe(true)
      expect(stagedPaths.every((entry) => !entry.includes('/iteration.md'))).toBe(true)
    } finally {
      runGitSpy.mockRestore()
    }
  })

  it('appends a new archive run to an existing active iteration manifest', async () => {
    const cwd = await makeTempRepo()
    const iteration = '2026-06-27-payment'
    const iterationPath = `docs/iterations/${iteration}`
    const sourcePath = 'docs/specs/payment.md'
    const manifestPath = path.join(cwd, iterationPath, 'manifest.json')
    const previousManifest: ArchiveManifest = {
      iteration,
      status: 'active',
      summaryStatus: 'generated',
      slugSource: {
        type: 'markdown-title',
        path: 'docs/specs/previous.md',
        title: 'Payment'
      },
      archiveRuns: [
        {
          runId: 'previous-run',
          commit: 'abc123',
          documents: [
            {
              sourcePath: 'docs/specs/previous.md',
              archivePath: `${iterationPath}/specs/previous.md`,
              category: 'specs',
              action: 'archive',
              reason: 'previous',
              sha256: 'a'.repeat(64)
            }
          ]
        }
      ]
    }

    await writeActiveIteration(cwd, {
      iteration,
      iterationPath,
      updatedAt: '2026-06-27T00:00:00.000Z'
    })
    await mkdir(path.dirname(manifestPath), { recursive: true })
    await writeFile(manifestPath, `${JSON.stringify(previousManifest, null, 2)}\n`, 'utf8')
    await writeRepoFile(cwd, sourcePath, '# 支付流程设计\n\n设计内容\n')
    await execFileAsync('git', ['add', sourcePath], { cwd })

    const result = await runArchiveCommand(cwd, { staged: true })
    expect(result.ok).toBe(true)

    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as ArchiveManifest
    expect(manifest.archiveRuns).toHaveLength(2)
    expect(manifest.archiveRuns[0]).toEqual(previousManifest.archiveRuns[0])
    expect(manifest.archiveRuns[1].documents[0]).toEqual(
      expect.objectContaining({
        sourcePath,
        archivePath: `${iterationPath}/specs/payment.md`,
        action: 'archive'
      })
    )
  })

  it('does not overwrite archived evidence from a previous run with the same basename', async () => {
    const cwd = await makeTempRepo()
    const iteration = '2026-06-27-payment'
    const iterationPath = `docs/iterations/${iteration}`
    const sourcePath = 'docs/specs/payment.md'
    const previousArchivePath = `${iterationPath}/specs/payment.md`
    const manifestPath = path.join(cwd, iterationPath, 'manifest.json')
    const previousManifest: ArchiveManifest = {
      iteration,
      status: 'active',
      summaryStatus: 'generated',
      slugSource: {
        type: 'markdown-title',
        path: sourcePath,
        title: '支付流程设计'
      },
      archiveRuns: [
        {
          runId: 'previous-run',
          commit: 'abc123',
          documents: [
            {
              sourcePath,
              archivePath: previousArchivePath,
              category: 'specs',
              action: 'archive',
              reason: 'previous',
              sha256: 'a'.repeat(64)
            }
          ]
        }
      ]
    }

    await writeActiveIteration(cwd, {
      iteration,
      iterationPath,
      updatedAt: '2026-06-27T00:00:00.000Z'
    })
    await mkdir(path.dirname(manifestPath), { recursive: true })
    await writeFile(manifestPath, `${JSON.stringify(previousManifest, null, 2)}\n`, 'utf8')
    await writeRepoFile(cwd, previousArchivePath, '# 旧归档\n\n旧证据\n')
    await writeRepoFile(cwd, sourcePath, '# 支付流程设计\n\n新证据\n')
    await execFileAsync('git', ['add', sourcePath], { cwd })

    const result = await runArchiveCommand(cwd, { staged: true })
    expect(result.ok).toBe(true)

    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as ArchiveManifest
    const nextArchivePath = manifest.archiveRuns[1].documents[0].archivePath
    expect(nextArchivePath).not.toBe(previousArchivePath)
    await expect(readFile(path.join(cwd, previousArchivePath), 'utf8')).resolves.toContain('旧证据')
    await expect(readFile(path.join(cwd, nextArchivePath!), 'utf8')).resolves.toContain('新证据')
  })

  it('assigns unique archive paths for same-basename docs in one staged batch', async () => {
    const cwd = await makeTempRepo()
    const firstPath = 'docs/specs/a/payment.md'
    const secondPath = 'docs/specs/b/payment.md'

    await writeRepoFile(cwd, firstPath, '# 支付流程 A\n\nA 证据\n')
    await writeRepoFile(cwd, secondPath, '# 支付流程 B\n\nB 证据\n')
    await execFileAsync('git', ['add', firstPath, secondPath], { cwd })

    const result = await runArchiveCommand(cwd, { staged: true })
    expect(result.ok).toBe(true)

    const archivePaths = result.changedFiles ?? []
    expect(archivePaths).toHaveLength(2)
    expect(new Set(archivePaths).size).toBe(2)
    await expect(readFile(path.join(cwd, archivePaths[0]), 'utf8')).resolves.toContain('A 证据')
    await expect(readFile(path.join(cwd, archivePaths[1]), 'utf8')).resolves.toContain('B 证据')
  })

  it('returns failure when target resolution is ambiguous', async () => {
    const cwd = await makeTempRepo()
    const firstIteration = '2026-06-26-支付流程设计'
    const secondIteration = '2026-06-27-支付流程设计'

    const firstManifest = path.join(
      cwd,
      'docs',
      'iterations',
      firstIteration,
      'manifest.json'
    )
    const secondManifest = path.join(
      cwd,
      'docs',
      'iterations',
      secondIteration,
      'manifest.json'
    )
    await mkdir(path.dirname(firstManifest), { recursive: true })
    await mkdir(path.dirname(secondManifest), { recursive: true })
    await writeFile(
      firstManifest,
      JSON.stringify(
        {
          iteration: firstIteration,
          status: 'active',
          summaryStatus: 'generated',
          slugSource: {
            type: 'markdown-title',
            path: 'docs/specs/payment.md',
            title: '支付流程设计'
          },
          archiveRuns: []
        },
        null,
        2
      ),
      'utf8'
    )
    await writeFile(
      secondManifest,
      JSON.stringify(
        {
          iteration: secondIteration,
          status: 'active',
          summaryStatus: 'generated',
          slugSource: {
            type: 'markdown-title',
            path: 'docs/specs/other-payment.md',
            title: '支付流程设计'
          },
          archiveRuns: []
        },
        null,
        2
      ),
      'utf8'
    )

    await writeRepoFile(cwd, 'docs/specs/payment.md', '# 支付流程设计\n\n内容\n')
    await execFileAsync('git', ['add', 'docs/specs/payment.md'], { cwd })

    const result = await runArchiveCommand(cwd, { staged: true })
    expect(result.ok).toBe(false)
    expect(result.message).toContain('Multiple active iterations match')
  })
})

describe('manifest and iteration markdown', () => {
  it('builds an active manifest and renders iteration markdown', () => {
    const slugSource: ArchiveManifest['slugSource'] = {
      type: 'markdown-title',
      path: 'docs/specs/payment.md',
      title: '支付流程设计'
    }
    const manifest = buildManifest({
      iteration: '2026-06-26-支付流程设计',
      summaryStatus: 'degraded',
      slugSource,
      documents: sampleArchiveDocs(),
      runId: '2026-06-26T10-00-00'
    })

    expect(manifest.status).toBe('active')
    expect(manifest.summaryStatus).toBe('degraded')
    expect(manifest.slugSource).toEqual(slugSource)
    expect(manifest.archiveRuns[0].commit).toBe('pending')
    expect(manifest.archiveRuns[0].runId).toBe('2026-06-26T10-00-00')
    expect(manifest.archiveRuns[0].documents[0].action).toBe('archive')

    const markdown = renderIterationMarkdown(manifest)
    expect(markdown).toContain('# 2026-06-26-支付流程设计')
    expect(markdown).toContain('summary_status: degraded')
    expect(markdown).toContain('- archive: docs/specs/payment.md')
    expect(markdown).toContain('## Verification')
    expect(markdown).toContain('not summarized')
    expect(markdown).toContain('## Risks')
  })

  it('renders - none when no archived documents exist', () => {
    const manifest = buildManifest({
      iteration: '2026-06-27-空迭代',
      summaryStatus: 'generated',
      slugSource: {
        type: 'fallback',
        title: '空迭代'
      },
      documents: [],
      runId: '2026-06-27T10-00-00'
    })
    const markdown = renderIterationMarkdown(manifest)
    expect(markdown).toContain('## Archived Documents')
    expect(markdown).toContain('- none')
  })

  it('renders sourcePath and archivePath for archived documents', () => {
    const manifest = buildManifest({
      iteration: '2026-06-28-支付归档',
      summaryStatus: 'generated',
      slugSource: {
        type: 'filename',
        path: 'docs/specs/payment.md',
        title: 'payment'
      },
      documents: [
        {
          sourcePath: 'docs/specs/payment.md',
          archivePath: 'docs/iterations/2026-06-28-支付归档/payment.md',
          category: 'specs',
          action: 'archive',
          reason: 'classified for archive',
          sha256: 'a'.repeat(64)
        }
      ],
      runId: '2026-06-28T10-00-00'
    })

    const markdown = renderIterationMarkdown(manifest)
    expect(markdown).toContain(
      '- archive: docs/specs/payment.md -> docs/iterations/2026-06-28-支付归档/payment.md'
    )
  })

  it('renders summary fallback reason when provided', () => {
    const manifest = buildManifest({
      iteration: '2026-06-29-支付归档',
      summaryStatus: 'degraded',
      slugSource: {
        type: 'filename',
        path: 'docs/specs/payment.md',
        title: 'payment'
      },
      documents: [],
      runId: '2026-06-29T10-00-00'
    })

    const markdown = renderIterationMarkdown(manifest, {
      fallbackSummaryReason: 'AI summary unavailable for 2026-06-29-支付归档'
    })

    expect(markdown).toContain('## Summary Fallback')
    expect(markdown).toContain('AI summary unavailable for 2026-06-29-支付归档')
  })
})

describe('resolveIterationTarget', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-27T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('works when markdownContentByPath is not provided', async () => {
    const cwd = await tempDir()
    const docs = sampleArchiveDocs()
    const target = await resolveIterationTarget(cwd, docs)

    const expectedSlug = toIterationSlug('payment')
    expect(target.iteration).toBe(`${new Date().toISOString().slice(0, 10)}-${expectedSlug}`)
    expect(target.iterationPath).toBe(`docs/iterations/${target.iteration}`)
    expect(target.slugSource).toEqual({
      type: 'filename',
      path: 'docs/specs/payment.md',
      title: 'payment'
    })
  })

  it('uses local active iteration file when valid', async () => {
    const cwd = await tempDir()
    await writeActiveIteration(cwd, {
      iteration: '2026-06-27-local',
      iterationPath: 'docs/iterations/2026-06-27-local',
      updatedAt: '2026-06-27T10:00:00.000Z'
    })

    const docs = sampleArchiveDocs()
    const markdownByPath = new Map([['docs/specs/payment.md', '# 支付流程设计\n...']])
    const target = await resolveIterationTarget(cwd, docs, markdownByPath)

    expect(target).toEqual({
      iteration: '2026-06-27-local',
      iterationPath: 'docs/iterations/2026-06-27-local',
      slugSource: {
        type: 'fallback',
        title: '2026-06-27-local'
      }
    })
  })

  it('ignores local active iteration with path traversal value and falls back to docs filename slug', async () => {
    const cwd = await tempDir()
    await writeActiveIteration(cwd, {
      iteration: '../../escape',
      iterationPath: 'docs/iterations/../../escape',
      updatedAt: '2026-06-27T10:00:00.000Z'
    })

    const docs = sampleArchiveDocs()
    const target = await resolveIterationTarget(cwd, docs)
    const expectedIteration = `${new Date().toISOString().slice(0, 10)}-${toIterationSlug('payment')}`

    expect(target.iteration).toBe(expectedIteration)
    expect(target.iteration).not.toBe('../../escape')
    expect(target.iterationPath).toBe(`docs/iterations/${expectedIteration}`)
    expect(target.iterationPath).not.toBe('docs/iterations/../../escape')
    expect(target.slugSource).toEqual({
      type: 'filename',
      path: 'docs/specs/payment.md',
      title: 'payment'
    })
  })

  it('reuses valid slugSource from local active manifest and normalizes iterationPath', async () => {
    const cwd = await tempDir()
    await writeActiveIteration(cwd, {
      iteration: '2026-06-27-local',
      iterationPath: '../../escape',
      updatedAt: '2026-06-27T10:00:00.000Z'
    })

    const localManifestPath = path.join(cwd, 'docs', 'iterations', '2026-06-27-local', 'manifest.json')
    await mkdir(path.dirname(localManifestPath), { recursive: true })
    await writeFile(
      localManifestPath,
      JSON.stringify(
        {
          iteration: '2026-06-27-local',
          status: 'active',
          summaryStatus: 'generated',
          slugSource: {
            type: 'markdown-title',
            path: 'docs/specs/local-spec.md',
            title: '本地收敛'
          },
          archiveRuns: [
            {
              runId: 'seed',
              commit: 'pending',
              documents: sampleArchiveDocs('docs/specs/local-spec.md')
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    )

    const docs = sampleArchiveDocs()
    const target = await resolveIterationTarget(cwd, docs)

    expect(target).toEqual({
      iteration: '2026-06-27-local',
      iterationPath: 'docs/iterations/2026-06-27-local',
      slugSource: {
        type: 'markdown-title',
        path: 'docs/specs/local-spec.md',
        title: '本地收敛'
      }
    })
  })

  it('ignores local iterationPath and constrains resolved iterationPath to docs/iterations/<iteration>', async () => {
    const cwd = await tempDir()
    await writeActiveIteration(cwd, {
      iteration: '2026-06-27-escape',
      iterationPath: '../../escape',
      updatedAt: '2026-06-27T10:00:00.000Z'
    })

    const docs = sampleArchiveDocs()
    const target = await resolveIterationTarget(cwd, docs)

    expect(target).toEqual({
      iteration: '2026-06-27-escape',
      iterationPath: 'docs/iterations/2026-06-27-escape',
      slugSource: {
        type: 'fallback',
        title: '2026-06-27-escape'
      }
    })
  })

  it('falls back to fallback slugSource when local active manifest has invalid slugSource', async () => {
    const cwd = await tempDir()
    await writeActiveIteration(cwd, {
      iteration: '2026-06-27-local',
      iterationPath: 'docs/iterations/2026-06-27-local',
      updatedAt: '2026-06-27T10:00:00.000Z'
    })
    const localManifestPath = path.join(cwd, 'docs', 'iterations', '2026-06-27-local', 'manifest.json')
    await mkdir(path.dirname(localManifestPath), { recursive: true })
    await writeFile(
      localManifestPath,
      JSON.stringify(
        {
          iteration: '2026-06-27-local',
          status: 'active',
          summaryStatus: 'generated',
          slugSource: {
            type: 'unknown-type',
            title: '错误类型'
          },
          archiveRuns: []
        } as any,
        null,
        2
      ),
      'utf8'
    )

    const docs = sampleArchiveDocs()
    const target = await resolveIterationTarget(cwd, docs)

    expect(target).toEqual({
      iteration: '2026-06-27-local',
      iterationPath: 'docs/iterations/2026-06-27-local',
      slugSource: {
        type: 'fallback',
        title: '2026-06-27-local'
      }
    })
  })

  it('falls back to docs-based inference when local active iteration JSON is invalid', async () => {
    const cwd = await tempDir()
    const statePath = path.join(cwd, '.quick-init', 'state', 'active-iteration.json')
    await mkdir(path.dirname(statePath), { recursive: true })
    await writeFile(statePath, '{invalid-json', 'utf8')

    const docs = sampleArchiveDocs('docs/specs/payment.md')
    const markdownByPath = new Map([['docs/specs/payment.md', '# 支付流程设计\n详细内容']])
    const target = await resolveIterationTarget(cwd, docs, markdownByPath)

    const expectedIteration = `${new Date().toISOString().slice(0, 10)}-${toIterationSlug('支付流程设计')}`
    expect(target.iteration).toBe(expectedIteration)
    expect(target.slugSource).toEqual({
      type: 'markdown-title',
      path: 'docs/specs/payment.md',
      title: '支付流程设计'
    })
  })

  it('reuses an existing active manifest when iteration suffix matches slug', async () => {
    const cwd = await tempDir()
    const docs: ArchiveDocument[] = sampleArchiveDocs()
    const iteration = '2026-06-26-支付流程设计'
    const manifestPath = path.join(cwd, 'docs', 'iterations', iteration, 'manifest.json')
    await mkdir(path.dirname(manifestPath), { recursive: true })
    await writeFile(
      manifestPath,
      JSON.stringify(
        {
          iteration,
          status: 'active',
          summaryStatus: 'generated',
          slugSource: {
            type: 'markdown-title',
            path: 'docs/specs/old-spec.md',
            title: '支付流程设计'
          },
          archiveRuns: [
            {
              runId: 'seed',
              commit: 'pending',
              documents: sampleArchiveDocs('docs/specs/old-spec.md')
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    )

    const markdownByPath = new Map([['docs/specs/payment.md', '# 支付流程设计\n详细内容']])
    const target = await resolveIterationTarget(cwd, docs, markdownByPath)

    expect(target.iteration).toBe(iteration)
    expect(target.iterationPath).toBe(`docs/iterations/${iteration}`)
    expect(target.slugSource).toEqual({
      type: 'markdown-title',
      path: 'docs/specs/old-spec.md',
      title: '支付流程设计'
    })
  })

  it('throws when multiple active manifests match the same slug', async () => {
    const cwd = await tempDir()
    const docs: ArchiveDocument[] = sampleArchiveDocs('docs/specs/payment.md')
    const firstIteration = '2026-06-26-payment'
    const secondIteration = '2026-06-27-payment'

    const firstManifestPath = path.join(cwd, 'docs', 'iterations', firstIteration, 'manifest.json')
    const secondManifestPath = path.join(cwd, 'docs', 'iterations', secondIteration, 'manifest.json')
    await mkdir(path.dirname(firstManifestPath), { recursive: true })
    await mkdir(path.dirname(secondManifestPath), { recursive: true })
    await writeFile(
      firstManifestPath,
      JSON.stringify(
        {
          iteration: firstIteration,
          status: 'active',
          summaryStatus: 'generated',
          slugSource: {
            type: 'markdown-title',
            path: 'docs/specs/old-spec.md',
            title: '支付流程设计'
          },
          archiveRuns: [
            {
              runId: 'seed',
              commit: 'pending',
              documents: sampleArchiveDocs('docs/specs/old-spec.md')
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    )
    await writeFile(
      secondManifestPath,
      JSON.stringify(
        {
          iteration: secondIteration,
          status: 'active',
          summaryStatus: 'generated',
          slugSource: {
            type: 'filename',
            path: 'docs/specs/other-spec.md',
            title: 'payment'
          },
          archiveRuns: [
            {
              runId: 'seed',
              commit: 'pending',
              documents: sampleArchiveDocs('docs/specs/other-spec.md')
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    )

    let error: unknown
    try {
      await resolveIterationTarget(cwd, docs)
    } catch (e) {
      error = e
    }

    expect(error).toBeInstanceOf(Error)
    const message = String((error as Error).message)
    expect(message).toContain('Multiple active iterations match')
    expect(message).toContain(firstIteration)
    expect(message).toContain(secondIteration)
  })

  it('ignores suffix-matched active manifests with non-date formatting and creates a new iteration', async () => {
    const cwd = await tempDir()
    const docs: ArchiveDocument[] = sampleArchiveDocs('docs/specs/子标题.md')
    const iteration = '2026-06-26-foo-bar'
    const manifestPath = path.join(cwd, 'docs', 'iterations', iteration, 'manifest.json')
    await mkdir(path.dirname(manifestPath), { recursive: true })
    await writeFile(
      manifestPath,
      JSON.stringify(
        {
          iteration,
          status: 'active',
          summaryStatus: 'generated',
          slugSource: {
            type: 'markdown-title',
            path: 'docs/specs/old-spec.md',
            title: 'foo-bar'
          },
          archiveRuns: [
            {
              runId: 'seed',
              commit: 'pending',
              documents: sampleArchiveDocs('docs/specs/old-spec.md')
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    )

    const markdownByPath = new Map([['docs/specs/子标题.md', '# bar\n详细内容']])
    const target = await resolveIterationTarget(cwd, docs, markdownByPath)

    expect(target.iteration).toBe(`${new Date().toISOString().slice(0, 10)}-bar`)
    expect(target.iterationPath).toBe(`docs/iterations/${target.iteration}`)
    expect(target.slugSource).toEqual({
      type: 'markdown-title',
      path: 'docs/specs/子标题.md',
      title: 'bar'
    })
  })

  it('ignores suffix-matched active manifests with invalid slugSource and creates a new iteration', async () => {
    const cwd = await tempDir()
    const docs: ArchiveDocument[] = sampleArchiveDocs('docs/specs/支付幂等性.md')
    const iteration = `${new Date().toISOString().slice(0, 10)}-支付幂等性`
    const manifestPath = path.join(cwd, 'docs', 'iterations', iteration, 'manifest.json')
    await mkdir(path.dirname(manifestPath), { recursive: true })
    await writeFile(
      manifestPath,
      JSON.stringify(
        {
          iteration,
          status: 'active',
          summaryStatus: 'generated',
          slugSource: {
            type: 'unknown-type',
            title: '支付幂等性'
          },
          archiveRuns: [
            {
              runId: 'seed',
              commit: 'pending',
              documents: sampleArchiveDocs('docs/specs/old-spec.md')
            }
          ]
        } as any,
        null,
        2
      ),
      'utf8'
    )

    const markdownByPath = new Map([
      ['docs/specs/支付幂等性.md', '# 支付幂等性回归测试\n详细内容']
    ])
    const target = await resolveIterationTarget(cwd, docs, markdownByPath)

    const expectedSlug = toIterationSlug('支付幂等性回归测试')
    expect(target.iteration).toBe(`${new Date().toISOString().slice(0, 10)}-${expectedSlug}`)
    expect(target.slugSource).toEqual({
      type: 'markdown-title',
      path: 'docs/specs/支付幂等性.md',
      title: '支付幂等性回归测试'
    })
  })

  it('creates a new iteration with Chinese slug when no local or active match', async () => {
    const cwd = await tempDir()
    const docs = sampleArchiveDocs('docs/specs/支付幂等性.md')
    const markdownByPath = new Map([
      ['docs/specs/支付幂等性.md', '# 支付幂等性回归测试\n详细内容']
    ])

    const target = await resolveIterationTarget(cwd, docs, markdownByPath)

    const expectedSlug = toIterationSlug('支付幂等性回归测试')
    expect(target.iteration).toBe(`${new Date().toISOString().slice(0, 10)}-${expectedSlug}`)
    expect(target.iterationPath).toBe(`docs/iterations/${target.iteration}`)
    expect(target.slugSource).toEqual({
      type: 'markdown-title',
      path: 'docs/specs/支付幂等性.md',
      title: '支付幂等性回归测试'
    })
  })
})
