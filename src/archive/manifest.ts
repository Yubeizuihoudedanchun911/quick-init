import { ArchiveDocument, ArchiveManifest, SummaryStatus } from '../core/types.js'

export interface BuildManifestInput {
  iteration: string
  summaryStatus: SummaryStatus
  slugSource: ArchiveManifest['slugSource']
  documents: ArchiveDocument[]
  runId: string
}

export function buildManifest(input: BuildManifestInput): ArchiveManifest {
  return {
    iteration: input.iteration,
    status: 'active',
    summaryStatus: input.summaryStatus,
    slugSource: input.slugSource,
    archiveRuns: [
      {
        runId: input.runId,
        commit: 'pending',
        documents: input.documents
      }
    ]
  }
}
