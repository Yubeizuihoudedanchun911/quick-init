import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

export async function makeTempRepo(): Promise<string> {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'quick-init-repo-'))
  await mkdir(path.join(cwd, '.git'))
  return cwd
}

export async function writeRepoFile(
  cwd: string,
  filePath: string,
  content: string,
): Promise<string> {
  const absPath = path.join(cwd, filePath)
  await mkdir(path.dirname(absPath), { recursive: true })
  await writeFile(absPath, content, 'utf8')
  return absPath
}
