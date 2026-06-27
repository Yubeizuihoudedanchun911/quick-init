import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

function hasQuickInitIgnore(content: string): boolean {
  return content.split(/\r?\n/).some((line) => line.trim() === '.quick-init/')
}

function appendQuickInitIgnore(content: string): string {
  const lineEnding = content.includes('\r\n') ? '\r\n' : '\n'

  if (content.length === 0) {
    return `.quick-init/${lineEnding}`
  }

  const normalized = content.endsWith('\n') || content.endsWith('\r') ? content : `${content}${lineEnding}`
  return `${normalized}.quick-init/${lineEnding}`
}

export async function ensureQuickInitIgnored(cwd: string): Promise<void> {
  const file = path.join(cwd, '.gitignore')
  let current = ''
  try {
    current = await readFile(file, 'utf8')
  } catch {
    current = ''
  }
  if (!hasQuickInitIgnore(current)) {
    current = appendQuickInitIgnore(current)
  }
  await writeFile(file, current, 'utf8')
}
