import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { CommandResult } from '../core/types.js'
import { QuickInitError } from '../core/errors.js'
import { runGit } from '../git/git.js'
import { ensureLocalConfig } from '../local/config.js'
import { summarizeArchive } from '../ai/summary.js'
import { writeActiveIteration } from '../local/state.js'
import { classifyMarkdown } from './classifier.js'
import { resolveIterationTarget } from './activeIteration.js'
import { buildManifest } from './manifest.js'
import { renderIterationMarkdown } from './iterationText.js'
import type { ArchiveDocument, SummaryStatus } from '../core/types.js'

interface ArchiveCommandOptions {
  staged: boolean
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

export async function runArchiveCommand(cwd: string, options: ArchiveCommandOptions): Promise<CommandResult> {
  if (!options.staged) {
    return { ok: false, message: 'archive requires --staged' }
  }

  try {
    const config = await ensureLocalConfig(cwd)
    if (!config.archive.enabled) {
      return { ok: true, message: 'Archive is disabled by local config' }
    }

    const stagedMarkdownFiles = await getStagedMarkdownFiles(cwd)
    if (stagedMarkdownFiles.length === 0) {
      return { ok: true, message: 'No staged Markdown files' }
    }

    const markdownByPath = new Map<string, string>()
    const documents = await Promise.all(
      stagedMarkdownFiles.map(async (sourcePath) => {
        const content = await readFile(path.join(cwd, sourcePath), 'utf8')
        markdownByPath.set(sourcePath, content)
        return classifyMarkdown(sourcePath, content)
      })
    )

    let target
    try {
      target = await resolveIterationTarget(cwd, documents, markdownByPath)
    } catch (error) {
      if (error instanceof QuickInitError) {
        return { ok: false, message: error.message }
      }
      throw error
    }

    const processedDocuments: ArchiveDocument[] = []
    for (const doc of documents) {
      if (doc.action === 'archive') {
        const archiveRelativePath = toPosix(path.join(target.iterationPath, doc.category, path.basename(doc.sourcePath)))
        await mkdir(path.join(cwd, target.iterationPath, doc.category), { recursive: true })
        await rename(path.join(cwd, doc.sourcePath), path.join(cwd, archiveRelativePath))
        processedDocuments.push({ ...doc, archivePath: archiveRelativePath })
      } else {
        processedDocuments.push(doc)
      }
    }

    const manifest = buildManifest({
      iteration: target.iteration,
      summaryStatus: 'degraded',
      slugSource: target.slugSource,
      documents: processedDocuments,
      runId: new Date().toISOString().replace(/[:.]/g, '-')
    })

    let summaryStatus: SummaryStatus
    let summaryMarkdown: string | undefined
    try {
      const summary = await summarizeArchive(manifest)
      summaryStatus = summary.status
      summaryMarkdown = summary.markdown
    } catch {
      summaryStatus = 'degraded'
    }

    manifest.summaryStatus = summaryStatus
    const iterationMarkdown = summaryMarkdown ?? renderIterationMarkdown(manifest)
    await mkdir(path.join(cwd, target.iterationPath), { recursive: true })
    await writeFile(path.join(cwd, target.iterationPath, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    await writeFile(path.join(cwd, target.iterationPath, 'iteration.md'), iterationMarkdown, 'utf8')

    await writeActiveIteration(cwd, {
      iteration: target.iteration,
      iterationPath: target.iterationPath,
      updatedAt: new Date().toISOString()
    })

    if (config.archive.autoStage) {
      const movedSources = processedDocuments.filter((doc) => doc.action === 'archive').map((doc) => doc.sourcePath)
      await runGit(cwd, ['add', '--', target.iterationPath])
      if (movedSources.length > 0) {
        await runGit(cwd, ['add', '-u', '--', ...movedSources])
      }
    }

    return {
      ok: true,
      message: `Archived Markdown into ${target.iterationPath}`,
      changedFiles: processedDocuments.map((doc) => doc.archivePath ?? doc.sourcePath)
    }
  } catch (error) {
    return { ok: false, message: errorMessage(error) }
  }
}
