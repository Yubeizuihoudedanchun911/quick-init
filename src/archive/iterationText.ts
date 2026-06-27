import { ArchiveManifest } from '../core/types.js'

interface RenderIterationMarkdownOptions {
  fallbackSummaryReason?: string
}

function renderArchivedDocuments(manifest: ArchiveManifest): string {
  const documents = manifest.archiveRuns.flatMap((run) => run.documents)
  if (!documents.length) {
    return '- none'
  }
  return documents
    .map((doc) => `- ${doc.action}: ${doc.sourcePath}${doc.archivePath ? ` -> ${doc.archivePath}` : ''}`)
    .join('\n')
}

export function renderIterationMarkdown(
  manifest: ArchiveManifest,
  options: RenderIterationMarkdownOptions = {}
): string {
  const fallbackSummarySection = options.fallbackSummaryReason
    ? `\n## Summary Fallback\n\n${options.fallbackSummaryReason}\n`
    : ''

  return `# ${manifest.iteration}

## Summary Status

summary_status: ${manifest.summaryStatus}
${fallbackSummarySection}

## Archived Documents

${renderArchivedDocuments(manifest)}

## Verification

not summarized

## Risks

not summarized
`
}
