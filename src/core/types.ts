export interface CommandResult {
  ok: boolean
  message: string
  changedFiles?: string[]
}

export interface InitializationSpec {
  project: {
    name: string
    description: string
    domain: string
    techStack: {
      language: string
      runtime?: string
      framework?: string
      packageManager?: string
      database?: string
      orm?: string
      testing?: string[]
      deployment?: string
    }
    features: string[]
    integrations: string[]
  }
  governance: {
    mode: 'full'
    codingRules: true
    commitRules: true
    iterationArchive: true
    docsSync: true
    documentationSubagent: true
    architectureDecisionRecords: true
  }
  tools: {
    claude: true
    codex: true
    cursor: true
    gemini: true
    copilot: true
    windsurf: true
  }
  automation: {
    gitHooks: true
    claudeHooks: true
    docArchiveCommand: true
    cheapModelDocSummary: true
    fallbackToManifestOnly: true
  }
}

export interface GeneratedFile {
  path: string
  content: string
  commit: boolean
}

export interface LocalConfig {
  archive: {
    enabled: boolean
    autoStage: boolean
    aiSummary: boolean
    model: 'cheap'
    timeoutMs: number
    fallbackToManifestOnly: boolean
  }
  hooks: {
    preCommitArchive: boolean
  }
}

export type ArchiveAction = 'archive' | 'keep' | 'summarize-only' | 'skip'
export type ArchiveCategory = 'specs' | 'designs' | 'verification' | 'decisions' | 'research' | 'rules' | 'tooling' | 'project' | 'unknown'
export type SummaryStatus = 'ok' | 'degraded' | 'generated'

export interface ArchiveDocument {
  sourcePath: string
  archivePath: string | null
  category: ArchiveCategory
  action: ArchiveAction
  reason: string
  sha256?: string
}

export interface ArchiveRun {
  runId: string
  commit: 'pending' | string
  documents: ArchiveDocument[]
}

export interface ArchiveManifest {
  iteration: string
  status: 'active' | 'closed'
  summaryStatus: SummaryStatus
  slugSource: {
    type: 'markdown-title' | 'filename' | 'content-field' | 'commit-message' | 'fallback'
    path?: string
    title: string
  }
  archiveRuns: ArchiveRun[]
}
