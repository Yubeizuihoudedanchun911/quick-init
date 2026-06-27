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
