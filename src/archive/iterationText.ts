import { ArchiveManifest } from '../core/types.js'

function renderArchivedDocuments(manifest: ArchiveManifest): string {
  const documents = manifest.archiveRuns.flatMap((run) => run.documents)
  if (!documents.length) {
    return '- none'
  }
  return documents
    .map((doc) => `- ${doc.action}: ${doc.sourcePath}${doc.archivePath ? ` -> ${doc.archivePath}` : ''}`)
    .join('\n')
}

export function renderIterationMarkdown(manifest: ArchiveManifest): string {
  return `# ${manifest.iteration}

## Summary Status

summary_status: ${manifest.summaryStatus}

## Archived Documents

${renderArchivedDocuments(manifest)}

## Verification

not summarized

## Risks

not summarized
`
}
