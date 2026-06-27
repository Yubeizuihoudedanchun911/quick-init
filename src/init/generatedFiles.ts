import { GeneratedFile, InitializationSpec } from '../core/types.js'
import {
  claudeInstructions,
  codexInstructions,
  copilotInstructions,
  claudeSettings,
  cursorGeneralRule,
  cursorDomainRule,
  geminiInstructions,
  windsurfRules
} from '../templates/aiTools.js'
import { codingRuleFiles } from '../templates/codingRules.js'
import { documentationAgentFile, documentationFiles } from '../templates/docs.js'
import { hookScriptFiles } from '../templates/scripts.js'

function committed(path: string, content: string): GeneratedFile {
  return { path, content, commit: true }
}

export function buildGeneratedFiles(spec: InitializationSpec): GeneratedFile[] {
  const files: GeneratedFile[] = [
    committed('CLAUDE.md', claudeInstructions(spec)),
    committed('AGENTS.md', codexInstructions(spec)),
    committed('GEMINI.md', geminiInstructions(spec)),
    committed('.windsurfrules', windsurfRules(spec)),
    committed('.cursor/rules/general.mdc', cursorGeneralRule(spec)),
    committed('.cursor/rules/domain.mdc', cursorDomainRule(spec)),
    committed('.claude/settings.json', claudeSettings(spec)),
    committed('.github/copilot-instructions.md', copilotInstructions(spec))
  ]

  for (const [path, content] of codingRuleFiles(spec)) files.push(committed(path, content))
  for (const [path, content] of documentationFiles(spec)) files.push(committed(path, content))
  const [agentPath, agentContent] = documentationAgentFile()
  files.push(committed(agentPath, agentContent))
  for (const [path, content] of hookScriptFiles()) files.push(committed(path, content))

  return files
}
