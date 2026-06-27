import { access, mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { CommandResult, GeneratedFile } from '../core/types.js'
import { ensureGitRepository, runGit } from '../git/git.js'
import { installPreCommitHook } from '../git/hooks.js'
import { scopedCommit } from '../git/scopedCommit.js'
import { ensureLocalConfig } from '../local/config.js'
import { ensureQuickInitIgnored } from '../local/gitignore.js'
import { deriveInitializationSpec } from './deriveSpec.js'
import { buildGeneratedFiles } from './generatedFiles.js'
import { buildInitialArchiveFiles } from './initialArchive.js'

async function writeGeneratedFile(cwd: string, file: GeneratedFile): Promise<void> {
  const fullPath = path.join(cwd, file.path)
  await mkdir(path.dirname(fullPath), { recursive: true })
  await writeFile(fullPath, file.content, 'utf8')
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function unstageArchivePaths(cwd: string, archivePaths: string[]): Promise<void> {
  if (archivePaths.length === 0) {
    return
  }

  try {
    await runGit(cwd, ['rev-parse', '--verify', '--quiet', 'HEAD'])
    await runGit(cwd, ['reset', '--', ...archivePaths])
  } catch {
    try {
      await runGit(cwd, ['rm', '--cached', '--', ...archivePaths])
    } catch {
      // best-effort cleanup: ignore unstage failures and continue to remove working files
    }
  }
}

async function cleanupArchiveFiles(cwd: string, archivePaths: string[]): Promise<void> {
  await Promise.all(
    archivePaths.map(async (archivePath) => {
      await rm(path.join(cwd, archivePath), { force: true })
    }),
  )
}

export async function runInitCommand(description: string, cwd: string): Promise<CommandResult> {
  const gitState = await ensureGitRepository(cwd)
  const spec = deriveInitializationSpec(description, cwd)
  const generatedFiles = buildGeneratedFiles(spec)

  for (const file of generatedFiles) {
    await writeGeneratedFile(cwd, file)
  }

  await ensureLocalConfig(cwd)
  await ensureQuickInitIgnored(cwd)
  try {
    const hookPath = await installPreCommitHook(cwd)
    const now = new Date()
    const archiveFiles = buildInitialArchiveFiles(generatedFiles, gitState.initialized, true, hookPath, now)
    for (const file of archiveFiles) {
      const fullPath = path.join(cwd, file.path)
      if (await fileExists(fullPath)) {
        return { ok: false, message: `Initial archive file already exists: ${file.path}` }
      }
    }
    const createdArchiveFiles: string[] = []
    for (const file of archiveFiles) {
      await writeGeneratedFile(cwd, file)
      createdArchiveFiles.push(file.path)
    }

    const commitPaths = [
      ...generatedFiles.filter((file) => file.commit).map((file) => file.path),
      ...archiveFiles.map((file) => file.path),
      '.gitignore'
    ]
    const result = await scopedCommit(cwd, commitPaths, 'chore: initialize quick-init governance', {
      skipHooks: true
    })

    if (!result.ok && createdArchiveFiles.length > 0) {
      await unstageArchivePaths(cwd, createdArchiveFiles)
      await cleanupArchiveFiles(cwd, createdArchiveFiles)
    }

    return result
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : 'Unknown hook installation failure'
    return { ok: false, message: `Failed to install pre-commit hook: ${message}` }
  }
}
