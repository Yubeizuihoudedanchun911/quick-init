#!/usr/bin/env node
import { CommandResult } from './core/types.js'
import { runInitCommand } from './init/initCommand.js'
import { runArchiveCommand } from './archive/archiveCommand.js'
import { runIterationCommand } from './iteration/commands.js'

function usage(): string {
  return [
    'Usage: quick-init <command>',
    'Commands:',
    '  init "<业务描述>"',
    '  archive --staged',
    '  iteration status',
    '  iteration start "<name>"',
    '  iteration close'
  ].join('\n')
}

export async function runCli(argv: string[], cwd: string = process.cwd()): Promise<CommandResult> {
  const [command, ...rest] = argv
  if (!command) {
    return { ok: false, message: usage() }
  }
  if (command === 'init') {
    const description = rest.join(' ').trim()
    if (!description) {
      return { ok: false, message: 'init requires a business description' }
    }
    return runInitCommand(description, cwd)
  }
  if (command === 'archive') {
    return runArchiveCommand(cwd, { staged: rest.includes('--staged') })
  }
  if (command === 'iteration') {
    return runIterationCommand(rest, cwd)
  }
  return { ok: false, message: `Unknown command: ${command}` }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runCli(process.argv.slice(2), process.cwd())
  console.log(result.message)
  process.exit(result.ok ? 0 : 1)
}
