import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import path from 'node:path'
import os from 'node:os'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const TEST_GIT_NAME = 'Quick Init Test'
const TEST_GIT_EMAIL = 'quick-init-test@local'

export async function makeTempRepo(): Promise<string> {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'quick-init-repo-'))
  await execFileAsync('git', ['init'], { cwd })
  await execFileAsync('git', ['config', 'user.name', TEST_GIT_NAME], { cwd })
  await execFileAsync('git', ['config', 'user.email', TEST_GIT_EMAIL], { cwd })
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
