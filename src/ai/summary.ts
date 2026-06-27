import { ArchiveManifest } from '../core/types.js'

export interface SummaryResult {
  status: 'ok' | 'degraded'
  markdown?: string
  reason?: string
}

export async function summarizeArchive(manifest: ArchiveManifest): Promise<SummaryResult> {
  return {
    status: 'degraded',
    reason: `AI summary unavailable for ${manifest.iteration}`
  }
}
