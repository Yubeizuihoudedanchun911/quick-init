import { InitializationSpec } from '../core/types.js'

export function claudeInstructions(spec: InitializationSpec): string {
  return `# ${spec.project.name} Claude Code Instructions

Use the shared rules in .coding-rules/.
Before changing files, understand the relevant docs and current git status.
When Markdown documents are staged, quick-init archive will classify and move them into docs/iterations/.
`
}

export function codexInstructions(spec: InitializationSpec): string {
  return `# AGENTS.md

请使用中文进行回复。
Follow .coding-rules/ as the shared project rule source.
The default documentation subagent is agents/documentation.md.
`
}

export function geminiInstructions(spec: InitializationSpec): string {
  return `# ${spec.project.name} Gemini CLI Instructions

Follow .coding-rules/ and preserve docs/iterations manifests as shared facts.
`
}

export function windsurfRules(spec: InitializationSpec): string {
  return `Follow .coding-rules/ for ${spec.project.name}. Keep .quick-init/ local and uncommitted.`
}

export function cursorGeneralRule(spec: InitializationSpec): string {
  return `---
description: Shared quick-init governance rules
globs:
  - "**/*"
alwaysApply: true
---

Use .coding-rules/ as the shared project rule source for ${spec.project.name}.
`
}

export function copilotInstructions(spec: InitializationSpec): string {
  return `# Copilot Instructions

Project: ${spec.project.name}
Use .coding-rules/ as the shared rule source.
`
}

export function claudeSettings(spec: InitializationSpec): string {
  return JSON.stringify(
    {
      hooks: {},
      permissions: {},
      quickInitArchiveIntent: `In ${spec.project.name}, generated governance documents will be classified and archived by quick-init workflows into docs/iterations/. This settings file is declarative only and does not embed archive business logic.`
    },
    null,
    2
  )
}

export function cursorDomainRule(spec: InitializationSpec): string {
  return `---
description: Domain governance rules
globs:
  - "**/*"
alwaysApply: true
---

## Domain Focus

Project domain: ${spec.project.domain}
  Governance and decision-making in this repository should prioritize conventions relevant to ${spec.project.domain} domain practices.
When generating or updating this project's documentation and agent rules, keep recommendations aligned to this domain and call out uncertainty with explicit placeholder-safe wording.
`
}
