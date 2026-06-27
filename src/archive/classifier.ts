import { createHash } from 'node:crypto'
import { ArchiveDocument, ArchiveCategory } from '../core/types.js'
import { extractMarkdownTitle as parseMarkdownTitle } from './markdown.js'

export { parseMarkdownTitle as extractMarkdownTitle }

const TOOLING_ROOT_DOCS = new Set(['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', '.windsurfrules'])
const PROJECT_DOCS = new Set([
  'README.md',
  'docs/architecture.md',
  'docs/tech-stack.md',
  'docs/changelog.md',
])

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/')
}

function categoryForPath(path: string): ArchiveCategory {
  if (path.startsWith('docs/specs/')) return 'specs'
  if (path.startsWith('docs/designs/')) return 'designs'
  if (path.startsWith('docs/verification/')) return 'verification'
  if (path.startsWith('docs/decisions/')) return 'decisions'
  if (path.startsWith('docs/research/')) return 'research'
  if (path.startsWith('.coding-rules/')) return 'rules'
  if (TOOLING_ROOT_DOCS.has(path)) return 'tooling'
  if (PROJECT_DOCS.has(path)) return 'project'
  return 'unknown'
}

export function classifyMarkdown(path: string, content: string): ArchiveDocument {
  const normalizedPath = normalizePath(path)
  const category = categoryForPath(normalizedPath)

  if (normalizedPath === '_README.md' || normalizedPath.endsWith('/_README.md')) {
    return {
      sourcePath: path,
      archivePath: null,
      category,
      action: 'skip',
      reason: 'workspace readme marker',
      sha256: sha256(content)
    }
  }

  const isArchiveCategory = ['specs', 'designs', 'verification', 'decisions', 'research'].includes(category)
  if (isArchiveCategory) {
    return {
      sourcePath: path,
      archivePath: null,
      category: category,
      action: 'archive',
      reason: 'matched archive directory',
      sha256: sha256(content)
    }
  }

  return {
    sourcePath: path,
    archivePath: null,
    category,
    action: 'summarize-only',
    reason: 'conservative default for non-archivable markdown',
    sha256: sha256(content)
  }
}
