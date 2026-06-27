import { InitializationSpec } from '../core/types.js'

export function documentationFiles(spec: InitializationSpec): Array<[string, string]> {
  return [
    ['docs/architecture.md', `# Architecture

Project: ${spec.project.name}

This file tracks durable architecture facts for the project.
`],
    ['docs/tech-stack.md', `# Tech Stack

- Language: ${spec.project.techStack.language}
- Runtime: ${spec.project.techStack.runtime ?? 'not specified'}
- Framework: ${spec.project.techStack.framework ?? 'not specified'}
`],
    ['docs/changelog.md', `# Changelog

Changes are summarized from iteration archives.
`],
    ['docs/specs/_README.md', '# Specs Workspace\n\nPlace staged feature specs here before archive.\n'],
    ['docs/designs/_README.md', '# Designs Workspace\n\nPlace staged design documents here before archive.\n'],
    ['docs/verification/_README.md', '# Verification Workspace\n\nPlace staged verification documents here before archive.\n'],
    ['docs/decisions/_README.md', '# Decisions Workspace\n\nPlace staged ADR documents here before archive.\n'],
    ['docs/research/_README.md', '# Research Workspace\n\nPlace staged research documents here before archive.\n'],
    ['docs/iterations/_README.md', '# Iterations\n\nArchived iteration records live here.\n']
  ]
}

export function documentationAgentFile(): [string, string] {
  return ['agents/documentation.md', `# Documentation Subagent

Purpose: classify staged Markdown, move archiveable documents into docs/iterations/, update iteration.md and manifest.json, and preserve evidence.

Allowed writes:
- docs/**

Disallowed writes:
- source code
- tests
- dependency files
- .quick-init/**

When evidence is missing, write "未确认" or "无法判断" instead of inventing details.
`]
}
