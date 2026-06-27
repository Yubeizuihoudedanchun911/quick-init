import { execFile } from 'node:child_process'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

import { runCli } from '../src/cli.js'
import { makeTempRepo, writeRepoFile } from './helpers/tempRepo.js'

const execFileAsync = promisify(execFile)

function splitLines(stdout: string): string[] {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

describe('quick-init e2e', () => {
  it('initializes governance and archives staged markdown on commit path', async () => {
    const cwd = await makeTempRepo()

    const init = await runCli(['init', 'TypeScript CLI 工具'], cwd)
    expect(init.ok).toBe(true)

    await writeRepoFile(cwd, 'docs/designs/payment.md', '# 支付流程设计\n\n设计内容\n')
    await execFileAsync('git', ['add', 'docs/designs/payment.md'], { cwd })

    const archive = await runCli(['archive', '--staged'], cwd)
    expect(archive.ok).toBe(true)

    const today = new Date().toISOString().slice(0, 10)
    const archivedDocument = `docs/iterations/${today}-支付流程设计/designs/payment.md`
    const iterationDir = path.join(cwd, `docs/iterations/${today}-支付流程设计`)

    await expect(access(path.join(cwd, archivedDocument))).resolves.toBeUndefined()

    const manifest = JSON.parse(await readFile(path.join(iterationDir, 'manifest.json'), 'utf8'))
    expect(manifest.summaryStatus).toBe('degraded')

    const { stdout } = await execFileAsync('git', ['-c', 'core.quotePath=false', 'diff', '--cached', '--name-only'], {
      cwd
    })
    const cachedPaths = splitLines(stdout)
    expect(cachedPaths).toContain(archivedDocument)
    expect(cachedPaths.some((filePath) => filePath.startsWith('.quick-init/'))).toBe(false)
  })
})
