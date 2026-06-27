import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import { ArchiveDocument, ArchiveManifest } from '../core/types.js'
import { extractMarkdownTitle } from './markdown.js'
import { toIterationSlug } from './slug.js'

export interface IterationTarget {
  iteration: string
  iterationPath: string
  slugSource: ArchiveManifest['slugSource']
}

interface LocalActiveIteration {
  iteration: string
  iterationPath: string
  updatedAt?: string
}

function localActivePath(cwd: string): string {
  return path.join(cwd, '.quick-init', 'active-iteration.json')
}

async function readActiveLocalIteration(cwd: string): Promise<LocalActiveIteration | null> {
  try {
    const raw = await readFile(localActivePath(cwd), 'utf8')
    const data = JSON.parse(raw) as Partial<LocalActiveIteration>

    if (
      typeof data === 'object' &&
      data !== null &&
      typeof data.iteration === 'string' &&
      data.iteration.trim().length > 0 &&
      typeof data.iterationPath === 'string' &&
      data.iterationPath.trim().length > 0
    ) {
      return {
        iteration: data.iteration,
        iterationPath: data.iterationPath,
        updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined
      }
    }

    return null
  } catch {
    return null
  }
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
      return Boolean(manifest && manifest.status === 'active' && typeof manifest.iteration === 'string')
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

export async function resolveIterationTarget(
  cwd: string,
  docs: ArchiveDocument[],
  markdownContentByPath: Map<string, string>
): Promise<IterationTarget> {
  const local = await readActiveLocalIteration(cwd)
  if (local) {
    const manifest = await readIterationManifest(cwd, local.iterationPath)
    return {
      iteration: local.iteration,
      iterationPath: local.iterationPath,
      slugSource: manifest?.slugSource ?? {
        type: 'fallback',
        title: local.iteration
      }
    }
  }

  const primaryDoc = docs.find((doc) => doc.action === 'archive') ?? docs[0]
  const { slugSource, slug } = sourceToSlugSource(primaryDoc, markdownContentByPath)
  const manifests = await readActiveManifests(cwd)
  const matchedManifest = manifests.find((manifest) => manifest.iteration.endsWith(`-${slug}`) || manifest.iteration.endsWith(slug))

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
