import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { CommandResult, GeneratedFile } from '../core/types.js'
import { ensureGitRepository } from '../git/git.js'
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
    await installPreCommitHook(cwd)
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : 'Unknown hook installation failure'
    return { ok: false, message: `Failed to install pre-commit hook: ${message}` }
  }

  const archiveFiles = buildInitialArchiveFiles(generatedFiles, gitState.initialized, true)
  for (const file of archiveFiles) {
    await writeGeneratedFile(cwd, file)
  }

  const commitPaths = [
    ...generatedFiles.filter((file) => file.commit).map((file) => file.path),
    ...archiveFiles.map((file) => file.path),
    '.gitignore'
  ]
  const result = await scopedCommit(cwd, commitPaths, 'chore: initialize quick-init governance', {
    skipHooks: true
  })
  return result
}
