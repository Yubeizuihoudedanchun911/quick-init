import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import { ArchiveDocument, ArchiveManifest } from '../core/types.js'
import { QuickInitError } from '../core/errors.js'
import { readActiveIteration } from '../local/state.js'
import { extractMarkdownTitle } from './markdown.js'
import { toIterationSlug } from './slug.js'

export interface IterationTarget {
  iteration: string
  iterationPath: string
  slugSource: ArchiveManifest['slugSource']
}

const validSlugSourceTypes = [
  'markdown-title',
  'filename',
  'content-field',
  'commit-message',
  'fallback'
] as const

type SlugSourceType = (typeof validSlugSourceTypes)[number]

function sanitizeLocalIteration(iteration: string): string | null {
  const trimmed = iteration.trim()
  if (trimmed.length === 0 || trimmed !== iteration) {
    return null
  }

  if (trimmed.includes('/') || trimmed.includes('\\')) {
    return null
  }

  const segments = trimmed.split(/[/\\]/)
  if (segments.some((segment) => segment === '.' || segment === '..' || segment.length === 0)) {
    return null
  }

  return trimmed
}

function isValidSlugSource(slugSource: unknown): slugSource is ArchiveManifest['slugSource'] {
  if (!slugSource || typeof slugSource !== 'object' || Array.isArray(slugSource)) {
    return false
  }

  const value = slugSource as Record<string, unknown>
  if (typeof value.type !== 'string' || !validSlugSourceTypes.includes(value.type as SlugSourceType)) {
    return false
  }

  if (typeof value.title !== 'string' || value.title.trim().length === 0) {
    return false
  }

  if (value.path !== undefined && typeof value.path !== 'string') {
    return false
  }

  return true
}

function sourceToSlugSource(doc: ArchiveDocument | undefined, markdownContentByPath: Map<string, string>): {
  slugSource: ArchiveManifest['slugSource']
  slug: string
} {
  if (!doc) {
    return {
      slugSource: {
        type: 'fallback',
        title: 'iteration'
      },
      slug: 'iteration'
    }
  }

  const content = markdownContentByPath.get(doc.sourcePath)
  const markdownTitle = content ? extractMarkdownTitle(content) : null
  if (markdownTitle) {
    return {
      slugSource: {
        type: 'markdown-title',
        path: doc.sourcePath,
        title: markdownTitle
      },
      slug: toIterationSlug(markdownTitle)
    }
  }

  const filename = path.basename(doc.sourcePath).replace(/\.md$/i, '')
  if (filename) {
    return {
      slugSource: {
        type: 'filename',
        path: doc.sourcePath,
        title: filename
      },
      slug: toIterationSlug(filename)
    }
  }

  return {
    slugSource: {
      type: 'fallback',
      title: 'iteration'
    },
    slug: 'iteration'
  }
}

async function readActiveManifests(cwd: string): Promise<ArchiveManifest[]> {
  const iterationRoot = path.join(cwd, 'docs', 'iterations')
  try {
    const entries = await readdir(iterationRoot, { withFileTypes: true })
    const manifests = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const manifestPath = path.join(iterationRoot, entry.name, 'manifest.json')
          try {
            const raw = await readFile(manifestPath, 'utf8')
            return JSON.parse(raw) as ArchiveManifest
          } catch {
            return null
          }
        })
    )
    return manifests.filter((manifest): manifest is ArchiveManifest => {
      return Boolean(
        manifest &&
          manifest.status === 'active' &&
          typeof manifest.iteration === 'string' &&
          isValidSlugSource(manifest.slugSource)
      )
    })
  } catch {
    return []
  }
}

async function readIterationManifest(cwd: string, iterationPath: string): Promise<ArchiveManifest | null> {
  try {
    const manifestPath = path.join(cwd, iterationPath, 'manifest.json')
    const raw = await readFile(manifestPath, 'utf8')
    const manifest = JSON.parse(raw) as ArchiveManifest
    return typeof manifest === 'object' && manifest !== null ? manifest : null
  } catch {
    return null
  }
}

function iterationSlug(iteration: string): string {
  const dateMatch = iteration.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/)
  if (dateMatch) {
    return dateMatch[2]
  }
  return iteration
}

export async function resolveIterationTarget(
  cwd: string,
  docs: ArchiveDocument[],
  markdownContentByPath: Map<string, string> = new Map()
): Promise<IterationTarget> {
  const local = await readActiveIteration(cwd)
  const safeLocalIteration = local ? sanitizeLocalIteration(local.iteration) : null
  if (safeLocalIteration) {
    const iterationPath = `docs/iterations/${safeLocalIteration}`
    const manifest = await readIterationManifest(cwd, iterationPath)
    let localSlugSource: ArchiveManifest['slugSource'] = { type: 'fallback', title: safeLocalIteration }
    if (manifest && isValidSlugSource(manifest.slugSource)) {
      localSlugSource = manifest.slugSource
    }
    return {
      iteration: safeLocalIteration,
      iterationPath,
      slugSource: localSlugSource
    }
  }

  const primaryDoc = docs.find((doc) => doc.action === 'archive') ?? docs[0]
  const { slugSource, slug } = sourceToSlugSource(primaryDoc, markdownContentByPath)
  const manifests = await readActiveManifests(cwd)
  const matchedManifests = manifests.filter((manifest) => iterationSlug(manifest.iteration) === slug)

  if (matchedManifests.length > 1) {
    const candidateIterations = matchedManifests.map((manifest) => manifest.iteration).join(', ')
    throw new QuickInitError(
      `Multiple active iterations match slug "${slug}": ${candidateIterations}`
    )
  }

  const matchedManifest = matchedManifests[0]

  if (matchedManifest) {
    return {
      iteration: matchedManifest.iteration,
      iterationPath: `docs/iterations/${matchedManifest.iteration}`,
      slugSource: matchedManifest.slugSource
    }
  }

  const date = new Date().toISOString().slice(0, 10)
  const iteration = `${date}-${slug}`

  return {
    iteration,
    iterationPath: `docs/iterations/${iteration}`,
    slugSource
  }
}
