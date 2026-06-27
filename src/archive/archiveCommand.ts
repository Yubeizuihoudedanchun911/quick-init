import { mkdir, readFile, rm, rmdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { CommandResult } from '../core/types.js'
import { QuickInitError } from '../core/errors.js'
import { runGit } from '../git/git.js'
import { ensureLocalConfig } from '../local/config.js'
import { clearActiveIteration, readActiveIteration, writeActiveIteration } from '../local/state.js'
import { summarizeArchive } from '../ai/summary.js'
import { classifyMarkdown } from './classifier.js'
import { resolveIterationTarget } from './activeIteration.js'
import { buildManifest } from './manifest.js'
import { renderIterationMarkdown } from './iterationText.js'
import type { ArchiveDocument, ArchiveManifest, SummaryStatus } from '../core/types.js'

interface ArchiveCommandOptions {
  staged: boolean
}

interface ArchivedFileWrite {
  sourcePath: string
  archivePath: string
  removedSourceContent: string | null
  previousArchiveContent: string | null
}

interface IndexEntry {
  gitPath: string
  mode: string
  oid: string
}

type NullableIndexEntry = IndexEntry | { gitPath: string; mode: null; oid: null }

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}

async function trackCreatedDirectory(
  absPath: string,
  createdDirectories: string[],
  createdDirectorySet: Set<string>
): Promise<void> {
  if (createdDirectorySet.has(absPath)) {
    return
  }

  try {
    const stats = await stat(absPath)
    if (!stats.isDirectory()) {
      throw new Error(`Expected existing path to be a directory: ${absPath}`)
    }
    return
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      createdDirectorySet.add(absPath)
      createdDirectories.push(absPath)
      return
    }
    throw error
  }
}

async function rollbackActiveIteration(
  cwd: string,
  touched: boolean,
  previousActive: Awaited<ReturnType<typeof readActiveIteration>>
): Promise<void> {
  if (!touched) {
    return
  }

  if (previousActive) {
    await clearActiveIteration(cwd)
    await writeActiveIteration(cwd, previousActive)
    return
  }

  await clearActiveIteration(cwd)
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Failed to run archive command'
}

function toPosix(relativePath: string): string {
  return relativePath.replaceAll(path.sep, '/')
}

async function getStagedMarkdownFiles(cwd: string): Promise<string[]> {
  const output = await runGit(cwd, ['diff', '--cached', '--name-only', '--diff-filter=ACM'])
  return output
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => item.endsWith('.md'))
}

async function readTextOrNull(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8')
  } catch {
    return null
  }
}

async function readStagedText(cwd: string, gitPath: string): Promise<string> {
  try {
    return await runGit(cwd, ['show', `:${gitPath}`])
  } catch (error) {
    throw new Error(`Failed to read staged markdown "${gitPath}": ${errorMessage(error)}`)
  }
}

async function unstageSourcePathsFromCache(cwd: string, paths: string[]): Promise<void> {
  for (const sourcePath of paths) {
    try {
      await runGit(cwd, ['rm', '--cached', '--force', '--ignore-unmatch', '--', sourcePath])
    } catch (error) {
      throw new Error(
        `Failed to unstage staged source path from cache: ${sourcePath}: ${errorMessage(error)}`
      )
    }
  }
}

function parseIndexEntry(line: string, gitPath: string): IndexEntry | null {
  const match = /^(\d+)\s+([0-9a-fA-F]+)\s+(\d+)\t([\s\S]+)$/.exec(line)
  if (!match) {
    return null
  }

  const [, mode, oid, stage, entryPath] = match
  if (stage !== '0' || entryPath !== gitPath) {
    return null
  }

  return { gitPath: entryPath, mode, oid }
}

async function captureIndexEntries(
  cwd: string,
  paths: string[],
  options: { requireEntry: boolean }
): Promise<NullableIndexEntry[]> {
  const entries: NullableIndexEntry[] = []
  for (const gitPath of paths) {
    const output = await runGit(cwd, ['ls-files', '--stage', '-z', '--', gitPath])
    const entry = output
      .split('\0')
      .filter(Boolean)
      .map((line) => parseIndexEntry(line, gitPath))
      .find((item): item is IndexEntry => item !== null)

    if (!entry) {
      if (options.requireEntry) {
        throw new Error(`Failed to capture staged cache entry: ${gitPath}`)
      }
      entries.push({ gitPath, mode: null, oid: null })
      continue
    }
    entries.push(entry)
  }

  return entries
}

async function restoreIndexEntries(cwd: string, entries: NullableIndexEntry[]): Promise<void> {
  const failedPaths: string[] = []
  for (const entry of entries) {
    try {
      if (entry.mode === null || entry.oid === null) {
        await runGit(cwd, ['rm', '--cached', '--force', '--ignore-unmatch', '--', entry.gitPath])
        continue
      }
      await runGit(cwd, ['update-index', '--add', '--cacheinfo', entry.mode, entry.oid, entry.gitPath])
    } catch {
      failedPaths.push(entry.gitPath)
    }
  }

  if (failedPaths.length > 0) {
    throw new Error(`Failed to restore staged cache entries: ${failedPaths.join(', ')}`)
  }
}

async function rollbackWriteFile(filePath: string, previousContent: string | null): Promise<void> {
  try {
    if (previousContent !== null) {
      await writeFile(filePath, previousContent, 'utf8')
      return
    }
    await rm(filePath, { force: true, recursive: true })
  } catch {
    // best-effort rollback
  }
}

function isArchiveManifest(value: unknown): value is ArchiveManifest {
  if (!value || typeof value !== 'object') {
    return false
  }
  const manifest = value as Partial<ArchiveManifest>
  return (
    typeof manifest.iteration === 'string' &&
    (manifest.status === 'active' || manifest.status === 'closed') &&
    typeof manifest.summaryStatus === 'string' &&
    Array.isArray(manifest.archiveRuns)
  )
}

function readPreviousManifest(text: string | null, iteration: string): ArchiveManifest | null {
  if (!text) {
    return null
  }

  try {
    const manifest = JSON.parse(text)
    if (isArchiveManifest(manifest) && manifest.iteration === iteration) {
      return manifest
    }
    return null
  } catch {
    return null
  }
}

function mergeArchiveManifest(previousManifest: ArchiveManifest | null, nextManifest: ArchiveManifest): ArchiveManifest {
  if (!previousManifest) {
    return nextManifest
  }

  return {
    ...previousManifest,
    status: 'active',
    summaryStatus: nextManifest.summaryStatus,
    archiveRuns: [...previousManifest.archiveRuns, ...nextManifest.archiveRuns]
  }
}

export async function runArchiveCommand(cwd: string, options: ArchiveCommandOptions): Promise<CommandResult> {
  if (!options.staged) {
    return { ok: false, message: 'archive requires --staged' }
  }

  const config = await ensureLocalConfig(cwd)
  if (!config.archive.enabled) {
    return { ok: true, message: 'Archive is disabled by local config' }
  }

  const stagedMarkdownFiles = await getStagedMarkdownFiles(cwd)
  if (stagedMarkdownFiles.length === 0) {
    return { ok: true, message: 'No staged Markdown files' }
  }

  const markdownByPath = new Map<string, string>()
  const documents: ArchiveDocument[] = []
  for (const sourcePath of stagedMarkdownFiles) {
    let content: string
    try {
      content = await readStagedText(cwd, sourcePath)
    } catch (error) {
      return { ok: false, message: errorMessage(error) }
    }
    markdownByPath.set(sourcePath, content)
    documents.push(classifyMarkdown(sourcePath, content))
  }

  let target
  try {
    target = await resolveIterationTarget(cwd, documents, markdownByPath)
  } catch (error) {
    if (error instanceof QuickInitError) {
      return { ok: false, message: error.message }
    }
    throw error
  }

  const iterationPath = path.join(cwd, target.iterationPath)
  const manifestRelativePath = toPosix(path.join(target.iterationPath, 'manifest.json'))
  const iterationMarkdownRelativePath = toPosix(path.join(target.iterationPath, 'iteration.md'))
  const manifestPath = path.join(iterationPath, 'manifest.json')
  const iterationMarkdownPath = path.join(iterationPath, 'iteration.md')
  const previousManifest = await readTextOrNull(manifestPath)
  const previousIterationMarkdown = await readTextOrNull(iterationMarkdownPath)
  const previousActive = await readActiveIteration(cwd)

  const archivedFileWrites: ArchivedFileWrite[] = []
  const stagedRestoreTargets: string[] = []
  const targetStagePaths: string[] = []
  let sourceIndexEntries: NullableIndexEntry[] = []
  let targetIndexEntries: NullableIndexEntry[] = []
  const createdFiles: string[] = []
  const createdDirectories: string[] = []
  const createdDirectorySet = new Set<string>()
  let activeIterationTouched = false

  try {
    const processedDocuments: ArchiveDocument[] = []
    for (const doc of documents) {
      if (doc.action === 'archive') {
        const archiveRelativePath = toPosix(
          path.join(target.iterationPath, doc.category, path.basename(doc.sourcePath))
        )
        const absoluteArchivePath = path.join(cwd, archiveRelativePath)
        const absoluteSourcePath = path.join(cwd, doc.sourcePath)
        const categoryDirectory = path.join(cwd, target.iterationPath, doc.category)
        const stagedContent = markdownByPath.get(doc.sourcePath) ?? ''
        const workingTreeContent = await readTextOrNull(absoluteSourcePath)
        const previousArchiveContent = await readTextOrNull(absoluteArchivePath)
        await trackCreatedDirectory(categoryDirectory, createdDirectories, createdDirectorySet)
        await mkdir(categoryDirectory, { recursive: true })
        const archivedWrite: ArchivedFileWrite = {
          sourcePath: doc.sourcePath,
          archivePath: archiveRelativePath,
          removedSourceContent: null,
          previousArchiveContent
        }
        await writeFile(absoluteArchivePath, stagedContent, 'utf8')
        archivedFileWrites.push(archivedWrite)
        if (workingTreeContent !== null && workingTreeContent === stagedContent) {
          await rm(absoluteSourcePath, { force: true })
          archivedWrite.removedSourceContent = workingTreeContent
        }
        stagedRestoreTargets.push(doc.sourcePath)
        targetStagePaths.push(archiveRelativePath)
        processedDocuments.push({ ...doc, archivePath: archiveRelativePath })
      } else {
        processedDocuments.push(doc)
      }
    }

    const manifest = mergeArchiveManifest(readPreviousManifest(previousManifest, target.iteration), buildManifest({
      iteration: target.iteration,
      summaryStatus: 'degraded',
      slugSource: target.slugSource,
      documents: processedDocuments,
      runId: new Date().toISOString().replace(/[:.]/g, '-')
    }))

    let summary: { status: SummaryStatus; markdown?: string; reason?: string } = {
      status: 'degraded',
      reason: `AI summary unavailable for ${target.iteration}`
    }
    try {
      summary = await summarizeArchive(manifest)
    } catch {
      summary = {
        status: 'degraded',
        reason: `AI summary unavailable for ${target.iteration}`
      }
    }
    if (summary.status === 'degraded' && !summary.reason) {
      summary.reason = `AI summary unavailable for ${target.iteration}`
    }

    manifest.summaryStatus = summary.status
    const renderFallbackReason =
      summary.status === 'degraded' && summary.reason ? { fallbackSummaryReason: summary.reason } : undefined
    const iterationMarkdown = summary.markdown ?? renderIterationMarkdown(manifest, renderFallbackReason)

    await trackCreatedDirectory(iterationPath, createdDirectories, createdDirectorySet)
    await mkdir(iterationPath, { recursive: true })
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    createdFiles.push(manifestPath)
    createdFiles.push(iterationMarkdownPath)
    await writeFile(iterationMarkdownPath, iterationMarkdown, 'utf8')
    targetStagePaths.push(manifestRelativePath, iterationMarkdownRelativePath)

    activeIterationTouched = true
    await writeActiveIteration(cwd, {
      iteration: target.iteration,
      iterationPath: target.iterationPath,
      updatedAt: new Date().toISOString()
    })

    if (config.archive.autoStage) {
      sourceIndexEntries = await captureIndexEntries(cwd, stagedRestoreTargets, { requireEntry: true })
      targetIndexEntries = await captureIndexEntries(cwd, [...new Set(targetStagePaths)], { requireEntry: false })
      await runGit(cwd, ['add', '--', ...new Set(targetStagePaths)])
      await unstageSourcePathsFromCache(cwd, stagedRestoreTargets)
    }

    return {
      ok: true,
      message: `Archived Markdown into ${target.iterationPath}`,
      changedFiles: processedDocuments.map((doc) => doc.archivePath ?? doc.sourcePath)
    }
  } catch (error) {
    for (const archivedWrite of archivedFileWrites) {
      if (archivedWrite.removedSourceContent !== null) {
        const sourceAbsolute = path.join(cwd, archivedWrite.sourcePath)
        try {
          await mkdir(path.dirname(sourceAbsolute), { recursive: true })
          await writeFile(sourceAbsolute, archivedWrite.removedSourceContent, 'utf8')
        } catch {
          // best-effort rollback; ignore source restore failures
        }
      }

      await rollbackWriteFile(path.join(cwd, archivedWrite.archivePath), archivedWrite.previousArchiveContent)
    }

    for (const file of createdFiles) {
      if (file === manifestPath) {
        await rollbackWriteFile(file, previousManifest)
        continue
      }
      if (file === iterationMarkdownPath) {
        await rollbackWriteFile(file, previousIterationMarkdown)
      }
    }

    const rollbackFailures: string[] = []
    if (config.archive.autoStage) {
      if (targetIndexEntries.length > 0) {
        try {
          await restoreIndexEntries(cwd, targetIndexEntries)
        } catch (rollbackError) {
          rollbackFailures.push(errorMessage(rollbackError))
        }
      }
      if (sourceIndexEntries.length > 0) {
        try {
          await restoreIndexEntries(cwd, sourceIndexEntries)
        } catch (rollbackError) {
          rollbackFailures.push(errorMessage(rollbackError))
        }
      }
    }
    const directoriesToCleanup = new Set(createdDirectories)
    directoriesToCleanup.add(iterationPath)
    for (const directory of [...directoriesToCleanup].sort((a, b) => b.length - a.length)) {
      try {
        await rmdir(directory)
      } catch {
        // best-effort cleanup for empty directories created during execution
      }
    }
    try {
      await rollbackActiveIteration(cwd, activeIterationTouched, previousActive)
    } catch (rollbackError) {
      rollbackFailures.push(`Failed to rollback active iteration state: ${errorMessage(rollbackError)}`)
    }

    const message =
      rollbackFailures.length > 0
        ? `${errorMessage(error)}; rollback failed: ${rollbackFailures.join('; ')}`
        : errorMessage(error)
    return { ok: false, message }
  }
}
