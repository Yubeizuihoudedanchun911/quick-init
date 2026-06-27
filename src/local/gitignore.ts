import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export async function ensureQuickInitIgnored(cwd: string): Promise<void> {
  const file = path.join(cwd, '.gitignore')
  let current = ''
  try {
    current = await readFile(file, 'utf8')
  } catch {
    current = ''
  }
  const lines = current.split(/\r?\n/).filter((line) => line.length > 0)
  if (!lines.includes('.quick-init/')) {
    lines.push('.quick-init/')
  }
  await writeFile(file, `${lines.join('\n')}\n`, 'utf8')
}
