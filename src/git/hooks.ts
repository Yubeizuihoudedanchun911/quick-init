import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const START = '# quick-init hook start'
const END = '# quick-init hook end'
const BLOCK = `${START}
quick-init archive --staged
${END}
`

export async function installPreCommitHook(cwd: string): Promise<void> {
  const hooksDir = path.join(cwd, '.git/hooks')
  const hookPath = path.join(hooksDir, 'pre-commit')

  await mkdir(hooksDir, { recursive: true })

  let current = ''
  try {
    current = await readFile(hookPath, 'utf8')
  } catch {
    current = '#!/usr/bin/env bash\nset -e\n'
  }

  if (!current.includes(START)) {
    const separator = current.endsWith('\n') || current.length === 0 ? '' : '\n'
    await writeFile(hookPath, `${current}${separator}${BLOCK}`, 'utf8')
  }

  await chmod(hookPath, 0o755)
}
